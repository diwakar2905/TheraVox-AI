"""add oauth fields to users table

Revision ID: e1f2g3h4i5j6
Revises: d9e2f3a4b5c6
Create Date: 2026-02-28 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e1f2g3h4i5j6'
down_revision: Union[str, None] = 'd9e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make hashed_password nullable (OAuth users have no password)
    op.alter_column('users', 'hashed_password', existing_type=sa.Text(), nullable=True)

    # Add OAuth provider fields
    op.add_column('users', sa.Column('oauth_provider', sa.String(20), nullable=True))
    op.add_column('users', sa.Column('oauth_id', sa.String(255), nullable=True))

    # Index on oauth_id for fast lookups
    op.create_index('ix_users_oauth_id', 'users', ['oauth_id'])

    # Unique constraint: a given (provider, oauth_id) pair can only belong to one user.
    # A partial unique index handles the NULL case correctly in PostgreSQL.
    op.execute(
        """
        CREATE UNIQUE INDEX uq_users_oauth
        ON users (oauth_provider, oauth_id)
        WHERE oauth_provider IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_users_oauth")
    op.drop_index('ix_users_oauth_id', table_name='users')
    op.drop_column('users', 'oauth_id')
    op.drop_column('users', 'oauth_provider')

    # Restore NOT NULL on hashed_password.
    # WARNING: This will fail if any OAuth-only accounts exist (hashed_password IS NULL).
    op.alter_column('users', 'hashed_password', existing_type=sa.Text(), nullable=False)
