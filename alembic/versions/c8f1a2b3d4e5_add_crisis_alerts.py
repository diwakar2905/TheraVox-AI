"""add crisis_alerts table

Revision ID: c8f1a2b3d4e5
Revises: b033e5d47b4a
Create Date: 2026-02-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c8f1a2b3d4e5'
down_revision: Union[str, None] = 'b033e5d47b4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'crisis_alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'),
                  nullable=True, index=True),
        sa.Column('severity', sa.String(20), nullable=False, index=True),
        sa.Column('source', sa.String(30), nullable=False, index=True),
        sa.Column('input_snippet', sa.Text(), nullable=False),
        sa.Column('signals_json', sa.Text(), nullable=False),
        sa.Column('recommended_action', sa.Text(), nullable=False),
        sa.Column('escalation_sent', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('resolved', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now(), index=True),
    )


def downgrade() -> None:
    op.drop_table('crisis_alerts')
