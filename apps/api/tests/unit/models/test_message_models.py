"""
Unit tests for Message database model
"""
import pytest
from sqlalchemy.orm import Session

from app.models.messages import Message as MessageModel
from app.models.projects import Project as ProjectModel


@pytest.mark.unit
@pytest.mark.models
def test_message_model_creation(test_db_session: Session):
    """Test creating a Message model instance."""
    # Create a project first (required for foreign key)
    project = ProjectModel(
        id="test_project_msg",
        name="Test Project for Messages"
    )
    test_db_session.add(project)
    test_db_session.commit()
    
    message_data = {
        "id": "msg_test_1",
        "project_id": "test_project_msg",
        "role": "user",
        "content": "Hello, this is a test message"
    }
    
    message = MessageModel(**message_data)
    test_db_session.add(message)
    test_db_session.commit()
    test_db_session.refresh(message)
    
    assert message.id == "msg_test_1"
    assert message.project_id == "test_project_msg"
    assert message.role == "user"
    assert message.content == "Hello, this is a test message"
    assert message.created_at is not None


@pytest.mark.unit
@pytest.mark.models
def test_message_model_with_metadata(test_db_session: Session):
    """Test Message model with metadata JSON field."""
    # Create a project first
    project = ProjectModel(
        id="test_project_meta",
        name="Test Project for Message Metadata"
    )
    test_db_session.add(project)
    test_db_session.commit()
    
    message = MessageModel(
        id="msg_meta_test",
        project_id="test_project_meta",
        role="assistant",
        content="Response with metadata",
        metadata_json={"cli_type": "claude", "model": "claude-3", "tokens": 150}
    )
    
    test_db_session.add(message)
    test_db_session.commit()
    test_db_session.refresh(message)
    
    assert message.metadata_json == {"cli_type": "claude", "model": "claude-3", "tokens": 150}
    assert message.metadata_json.get("cli_type") == "claude"


@pytest.mark.unit
@pytest.mark.models
def test_message_model_relationships(test_db_session: Session):
    """Test Message model relationship with Project."""
    # Create a project
    project = ProjectModel(
        id="test_project_rel",
        name="Test Project for Relationships"
    )
    test_db_session.add(project)
    
    # Create messages
    messages = [
        MessageModel(
            id="msg_rel_1",
            project_id="test_project_rel",
            role="user",
            content="First message"
        ),
        MessageModel(
            id="msg_rel_2",
            project_id="test_project_rel", 
            role="assistant",
            content="Second message"
        )
    ]
    
    for msg in messages:
        test_db_session.add(msg)
    test_db_session.commit()
    
    # Query messages by project
    project_messages = test_db_session.query(MessageModel).filter(
        MessageModel.project_id == "test_project_rel"
    ).all()
    
    assert len(project_messages) == 2
    assert all(msg.project_id == "test_project_rel" for msg in project_messages)


@pytest.mark.unit
@pytest.mark.models
def test_message_model_role_types(test_db_session: Session):
    """Test Message model with different role types."""
    # Create a project first
    project = ProjectModel(
        id="test_project_roles",
        name="Test Project for Role Types"
    )
    test_db_session.add(project)
    test_db_session.commit()
    
    roles = ["user", "assistant", "system", "tool"]
    for i, role in enumerate(roles):
        message = MessageModel(
            id=f"msg_role_{i}",
            project_id="test_project_roles",
            role=role,
            content=f"Message from {role}",
            message_type="chat" if role != "tool" else "tool_result"
        )
        test_db_session.add(message)
    
    test_db_session.commit()
    
    # Verify all roles were saved correctly
    for role in roles:
        found_message = test_db_session.query(MessageModel).filter(
            MessageModel.role == role,
            MessageModel.project_id == "test_project_roles"
        ).first()
        assert found_message is not None
        assert found_message.role == role