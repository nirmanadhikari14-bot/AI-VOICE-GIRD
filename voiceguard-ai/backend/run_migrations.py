from alembic import command
from alembic.config import Config
import logging

logging.basicConfig(level=logging.DEBUG)

try:
    alembic_cfg = Config("alembic.ini")
    print("Running autogenerate...")
    command.revision(alembic_cfg, autogenerate=True, message="Initial migration")
    print("Running upgrade head...")
    command.upgrade(alembic_cfg, "head")
    print("Done!")
except Exception as e:
    print(f"Error: {e}")
