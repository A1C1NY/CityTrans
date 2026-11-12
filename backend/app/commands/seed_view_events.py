"""Generate simulated line/stop detail view events for analytics demos.

Usage (run from the ``backend`` directory)::

    python -m app.commands.seed_view_events --dry-run
    python -m app.commands.seed_view_events --days 30 --line-events 20000 --stop-events 20000
    python -m app.commands.seed_view_events --clear          # remove simulated rows

Simulated rows are recognisable by their owner: users named ``sim_*`` and
anonymous rows (``user_id IS NULL``) inside the generated time window.
"""

import argparse
import random
import sys
from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy import delete, insert, or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.core.time import now_shanghai, to_mysql_datetime
from app.db.session import session_scope
from app.models.account import LineViewEvent, StopViewEvent, User
from app.models.transit import BusLine, BusLineStop, BusStop

SIM_PREFIX = "sim_"
SIM_PASSWORD = "sim-password-123"
BATCH_SIZE = 5000

# Hour-of-day weights (index = hour 0..23).
COMMUTE_WEEKDAY = [1, 1, 1, 1, 2, 5, 14, 30, 28, 14, 9, 9, 11, 10, 8, 9, 14, 28, 30, 18, 10, 6, 3, 2]
LEISURE_WEEKDAY = [1, 1, 1, 1, 1, 2, 4, 7, 10, 14, 16, 16, 15, 14, 14, 15, 15, 14, 13, 12, 9, 6, 3, 2]
WEEKEND = [1, 1, 1, 1, 1, 2, 3, 6, 10, 15, 18, 18, 16, 15, 15, 16, 16, 15, 13, 11, 8, 5, 3, 2]
WEEKDAY_FACTOR = [1.0, 1.0, 1.0, 1.05, 1.15, 0.75, 0.7]  # Mon..Sun

ROLE_WEIGHTS = {"anonymous": 55, "passenger": 38, "analyst": 4, "admin": 3}
LINE_ENTRY = {"search": 60, "favorite": 15, "direct": 25}
STOP_ENTRY = {"search": 45, "line_map": 30, "favorite": 10, "direct": 15}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--days", type=int, default=30, help="回填最近多少天（含今天），默认 30")
    parser.add_argument("--line-events", type=int, default=20000, help="线路详情事件数")
    parser.add_argument("--stop-events", type=int, default=20000, help="站点详情事件数")
    parser.add_argument("--users", type=int, default=30, help="模拟乘客账号数")
    parser.add_argument("--zipf", type=float, default=1.1, help="热度长尾指数，越大越集中")
    parser.add_argument("--seed", type=int, default=None, help="随机种子，固定后结果可复现")
    parser.add_argument("--dry-run", action="store_true", help="只打印摘要，不写库")
    parser.add_argument("--clear", action="store_true", help="删除模拟数据后退出")
    parser.add_argument(
        "--no-clear-first",
        action="store_true",
        help="生成前不清理旧的模拟数据（默认会先清理，避免重复叠加）",
    )
    return parser


def _window(days: int) -> tuple[datetime, datetime]:
    """Return naive Shanghai (start, now) for the backfill window."""

    now = now_shanghai()
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return to_mysql_datetime(start), to_mysql_datetime(now)


def clear_simulated(session: Session, start: datetime, end: datetime) -> tuple[int, int]:
    sim_user_ids = select(User.id).where(User.username.like(f"{SIM_PREFIX}%"))
    counts = []
    for model in (LineViewEvent, StopViewEvent):
        condition = or_(
            model.user_id.in_(sim_user_ids),
            (model.user_id.is_(None)) & (model.viewed_at >= start) & (model.viewed_at <= end),
        )
        result = session.execute(delete(model).where(condition))
        counts.append(result.rowcount)
    return counts[0], counts[1]


def _zipf_weights(ids: list[int], exponent: float, rng: random.Random) -> dict[int, float]:
    shuffled = ids[:]
    rng.shuffle(shuffled)
    return {item: 1.0 / (rank**exponent) for rank, item in enumerate(shuffled, start=1)}


def _ensure_users(session: Session, passenger_count: int) -> dict[str, list[int]]:
    wanted: dict[str, list[str]] = {
        "passenger": [f"{SIM_PREFIX}user_{i:02d}" for i in range(1, passenger_count + 1)],
        "analyst": [f"{SIM_PREFIX}analyst_01"],
        "admin": [f"{SIM_PREFIX}admin_01"],
    }
    existing = {
        user.username: user
        for user in session.scalars(select(User).where(User.username.like(f"{SIM_PREFIX}%")))
    }
    password_hash = hash_password(SIM_PASSWORD)  # argon2 很慢，只算一次
    for role, names in wanted.items():
        for name in names:
            if name not in existing:
                user = User(username=name, password_hash=password_hash, role=role)
                session.add(user)
                existing[name] = user
    session.flush()
    return {role: [existing[name].id for name in names] for role, names in wanted.items()}


def _make_time_sampler(start: datetime, end: datetime, rng: random.Random):
    days = []
    day = start
    while day <= end:
        days.append(day)
        day += timedelta(days=1)
    span = max(len(days) - 1, 1)
    # 每天一个基础权重：星期系数 × 缓慢上升趋势 × 随机波动
    day_weights = [
        WEEKDAY_FACTOR[d.weekday()] * (0.8 + 0.4 * i / span) * rng.uniform(0.75, 1.25)
        for i, d in enumerate(days)
    ]

    def sample(profile: str) -> datetime:
        while True:
            day = rng.choices(days, day_weights)[0]
            hours = WEEKEND if day.weekday() >= 5 else (COMMUTE_WEEKDAY if profile == "commute" else LEISURE_WEEKDAY)
            hour = rng.choices(range(24), hours)[0]
            moment = day.replace(
                hour=hour,
                minute=rng.randrange(60),
                second=rng.randrange(60),
                microsecond=rng.randrange(1000) * 1000,
            )
            if start <= moment <= end:  # 不生成未来时间
                return moment

    return sample


def _pick_entry(weights: dict[str, int], anonymous: bool, rng: random.Random) -> str:
    options = {k: v for k, v in weights.items() if not (anonymous and k == "favorite")}
    return rng.choices(list(options), list(options.values()))[0]


def _generate(
    count: int,
    *,
    target_key: str,
    targets: dict[int, float],
    profiles: dict[int, str],
    entry_weights: dict[str, int],
    users: dict[str, list[int]],
    user_weights: list[float],
    sample_time,
    rng: random.Random,
) -> list[dict]:
    target_ids = list(targets)
    target_w = list(targets.values())
    roles = list(ROLE_WEIGHTS)
    role_w = list(ROLE_WEIGHTS.values())
    rows = []
    for _ in range(count):
        target = rng.choices(target_ids, target_w)[0]
        role = rng.choices(roles, role_w)[0]
        if role == "anonymous":
            user_id = None
        elif role == "passenger":
            user_id = rng.choices(users["passenger"], user_weights)[0]
        else:
            user_id = rng.choice(users[role])
        rows.append(
            {
                "user_id": user_id,
                "actor_role": role,
                target_key: target,
                "entry_point": _pick_entry(entry_weights, user_id is None, rng),
                "viewed_at": sample_time(profiles[target]),
            }
        )
    return rows


def _insert_batches(session: Session, model, rows: list[dict]) -> None:
    for i in range(0, len(rows), BATCH_SIZE):
        session.execute(insert(model), rows[i : i + BATCH_SIZE])


def _summary(name: str, rows: list[dict], key: str) -> None:
    by_target: dict[int, int] = defaultdict(int)
    by_hour = [0] * 24
    for row in rows:
        by_target[row[key]] += 1
        by_hour[row["viewed_at"].hour] += 1
    top = sorted(by_target.items(), key=lambda x: -x[1])[:5]
    print(f"[{name}] 共 {len(rows)} 条，涉及 {len(by_target)} 个对象；Top5(id,次数)={top}")
    print(f"[{name}] 各小时次数: {by_hour}")


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.days < 1:
        print("--days 必须 >= 1", file=sys.stderr)
        return 2
    rng = random.Random(args.seed)
    start, end = _window(args.days)

    if args.clear:
        with session_scope() as session:
            line_n, stop_n = clear_simulated(session, start, end)
        print(f"已删除 line_view_events {line_n} 条、stop_view_events {stop_n} 条")
        return 0

    with session_scope() as session:
        line_ids = list(session.scalars(select(BusLine.id).where(BusLine.is_active.is_(True))))
        stop_ids = list(session.scalars(select(BusStop.id).where(BusStop.is_active.is_(True))))
        if not line_ids or not stop_ids:
            print("数据库里没有线路或站点，请先运行 import_samples 或抓取数据", file=sys.stderr)
            return 1
        line_stops = session.execute(select(BusLineStop.line_id, BusLineStop.stop_id)).all()

        # 线路热度服从长尾；站点热度 = 经过它的线路热度之和（枢纽站自然更热）+ 一点自身随机
        line_weights = _zipf_weights(line_ids, args.zipf, rng)
        stop_weights = {s: 0.02 * rng.random() * max(line_weights.values()) for s in stop_ids}
        for line_id, stop_id in line_stops:
            if stop_id in stop_weights and line_id in line_weights:
                stop_weights[stop_id] += line_weights[line_id]
        profiles_line = {i: rng.choice(["commute", "commute", "leisure"]) for i in line_ids}
        profiles_stop = {i: rng.choice(["commute", "commute", "leisure"]) for i in stop_ids}

        sample_time = _make_time_sampler(start, end, rng)
        passenger_n = max(args.users, 1)
        user_weights = [1.0 / (r**0.9) for r in range(1, passenger_n + 1)]

        # 先在内存里生成，dry-run 时不会改库
        if not args.dry_run:
            if not args.no_clear_first:
                clear_simulated(session, start, end)
            users = _ensure_users(session, passenger_n)
        else:
            users = {
                "passenger": list(range(1, passenger_n + 1)),
                "analyst": [0],
                "admin": [0],
            }

        common = dict(users=users, user_weights=user_weights, sample_time=sample_time, rng=rng)
        line_rows = _generate(
            args.line_events, target_key="line_id", targets=line_weights,
            profiles=profiles_line, entry_weights=LINE_ENTRY, **common,
        )
        stop_rows = _generate(
            args.stop_events, target_key="stop_id", targets=stop_weights,
            profiles=profiles_stop, entry_weights=STOP_ENTRY, **common,
        )

        print(f"时间窗口: {start} ~ {end}（上海本地时间）")
        _summary("line", line_rows, "line_id")
        _summary("stop", stop_rows, "stop_id")

        if args.dry_run:
            print("dry-run：未写入数据库")
            session.rollback()
            return 0
        _insert_batches(session, LineViewEvent, line_rows)
        _insert_batches(session, StopViewEvent, stop_rows)
    print("写入完成")
    return 0


if __name__ == "__main__":
    sys.exit(main())
