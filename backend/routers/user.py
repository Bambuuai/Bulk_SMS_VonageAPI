from typing import Annotated, List

from fastapi import APIRouter, HTTPException, status, Depends

from models.auth_models import UserWithMSI
from models.base_models import VonageNumber
from . import contact, profile, dnc, campaign
from .auth import get_current_active_user


def get_current_user_only(current_user: Annotated[UserWithMSI, Depends(get_current_active_user)]) -> UserWithMSI:
    if current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="You do not have permission to access this resource.")
    return current_user


router = APIRouter(prefix="/user", tags=["user"], dependencies=[Depends(get_current_user_only)])
router.include_router(profile.router)
router.include_router(dnc.router)
router.include_router(contact.router)
router.include_router(campaign.router)


@router.get("/numbers", response_model=List[VonageNumber])
async def get_numbers(
        current_user: UserWithMSI = Depends(get_current_user_only)
) -> List[VonageNumber]:
    return current_user.numbers
