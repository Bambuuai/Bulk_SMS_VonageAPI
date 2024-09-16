from typing import Annotated

from fastapi import Depends, APIRouter

from models.auth_models import UserWithMSI
from .utilities import get_current_active_user

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/", response_model=UserWithMSI)
async def read_users_me(
        current_user: Annotated[UserWithMSI, Depends(get_current_active_user)],
):
    return current_user
