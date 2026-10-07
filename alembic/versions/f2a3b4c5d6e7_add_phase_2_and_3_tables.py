"""add phase 2 and 3 tables (feedback, emergency contacts, push, therapist, programs, audit) and user role/language

Revision ID: f2a3b4c5d6e7
Revises: e1f2g3h4i5j6
Create Date: 2026-10-07 08:23:58.444243

These ORM models were added without a migration, so a fresh `alembic upgrade head`
produced a schema the app could not use.

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, None] = 'e1f2g3h4i5j6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('audit_logs',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=True),
    sa.Column('action', sa.String(length=100), nullable=False),
    sa.Column('resource', sa.String(length=200), nullable=False),
    sa.Column('ip_address', sa.String(length=45), nullable=True),
    sa.Column('details_json', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)
    op.create_table('emergency_contacts',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('phone', sa.String(length=30), nullable=True),
    sa.Column('email', sa.String(length=320), nullable=True),
    sa.Column('relationship_type', sa.String(length=100), nullable=False),
    sa.Column('is_primary', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_emergency_contacts_user_id'), 'emergency_contacts', ['user_id'], unique=False)
    op.create_table('feedback',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=True),
    sa.Column('category', sa.String(length=30), nullable=False),
    sa.Column('subject', sa.String(length=200), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('rating', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_feedback_category'), 'feedback', ['category'], unique=False)
    op.create_index(op.f('ix_feedback_created_at'), 'feedback', ['created_at'], unique=False)
    op.create_index(op.f('ix_feedback_user_id'), 'feedback', ['user_id'], unique=False)
    op.create_table('program_enrollments',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('program_id', sa.String(length=100), nullable=False),
    sa.Column('completed_steps', sa.Text(), nullable=False),
    sa.Column('progress_percent', sa.Float(), nullable=False),
    sa.Column('badge_earned', sa.String(length=100), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_program_enrollments_program_id'), 'program_enrollments', ['program_id'], unique=False)
    op.create_index(op.f('ix_program_enrollments_user_id'), 'program_enrollments', ['user_id'], unique=False)
    op.create_table('push_subscriptions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('endpoint', sa.Text(), nullable=False),
    sa.Column('p256dh', sa.Text(), nullable=False),
    sa.Column('auth', sa.Text(), nullable=False),
    sa.Column('preferred_time', sa.String(length=10), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('endpoint')
    )
    op.create_index(op.f('ix_push_subscriptions_user_id'), 'push_subscriptions', ['user_id'], unique=False)
    op.create_table('therapist_client_links',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('therapist_id', sa.UUID(), nullable=False),
    sa.Column('client_id', sa.UUID(), nullable=True),
    sa.Column('invite_code', sa.String(length=20), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('consent_shared', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['client_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['therapist_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_therapist_client_links_client_id'), 'therapist_client_links', ['client_id'], unique=False)
    op.create_index(op.f('ix_therapist_client_links_invite_code'), 'therapist_client_links', ['invite_code'], unique=True)
    op.create_index(op.f('ix_therapist_client_links_therapist_id'), 'therapist_client_links', ['therapist_id'], unique=False)
    # server_default backfills existing rows so the NOT NULL constraint holds
    op.add_column('users', sa.Column('role', sa.String(length=20), server_default='user', nullable=False))
    op.add_column('users', sa.Column('language_preference', sa.String(length=10), server_default='en', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'language_preference')
    op.drop_column('users', 'role')
    op.drop_index(op.f('ix_therapist_client_links_therapist_id'), table_name='therapist_client_links')
    op.drop_index(op.f('ix_therapist_client_links_invite_code'), table_name='therapist_client_links')
    op.drop_index(op.f('ix_therapist_client_links_client_id'), table_name='therapist_client_links')
    op.drop_table('therapist_client_links')
    op.drop_index(op.f('ix_push_subscriptions_user_id'), table_name='push_subscriptions')
    op.drop_table('push_subscriptions')
    op.drop_index(op.f('ix_program_enrollments_user_id'), table_name='program_enrollments')
    op.drop_index(op.f('ix_program_enrollments_program_id'), table_name='program_enrollments')
    op.drop_table('program_enrollments')
    op.drop_index(op.f('ix_feedback_user_id'), table_name='feedback')
    op.drop_index(op.f('ix_feedback_created_at'), table_name='feedback')
    op.drop_index(op.f('ix_feedback_category'), table_name='feedback')
    op.drop_table('feedback')
    op.drop_index(op.f('ix_emergency_contacts_user_id'), table_name='emergency_contacts')
    op.drop_table('emergency_contacts')
    op.drop_index(op.f('ix_audit_logs_user_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_created_at'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_table('audit_logs')
