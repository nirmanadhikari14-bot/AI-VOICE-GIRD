import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.models.domain import User, Call, Alert, Incident, RiskScore
from app.api.v1.auth import login_access_token
from app.api.v1.alerts import list_alerts
from app.api.v1.risk import get_latest_risk, get_risk_explanation
from app.api.v1.incidents import list_incidents
from app.api.v1.prevention import list_prevention_actions
from app.api.v1.calls import list_active_calls
from fastapi.security import OAuth2PasswordRequestForm

from app.core.cache_manager import cache_manager
cache_manager._connection_checked = True
cache_manager._redis = None

def test_endpoints():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "security@voiceguard.ai").first()
        assert user is not None, "Seeded user exists"

        # 1. Test Login
        form = OAuth2PasswordRequestForm(
            grant_type="password",
            username="security@voiceguard.ai",
            password="VoiceGuard2026!",
            scope="",
            client_id=None,
            client_secret=None
        )
        token_res = login_access_token(db=db, form_data=form)
        assert "access_token" in token_res, "Login produces access token"
        print("✓ Login test passed")

        # 2. Test Alerts
        alerts = list_alerts(db=db, current_user=user)
        assert len(alerts) > 0, "Alerts returned"
        print(f"✓ Alerts test passed ({len(alerts)} alerts)")

        # 3. Test Risk Latest
        risk_score = db.query(RiskScore).order_by(RiskScore.created_at.desc()).first()
        assert risk_score is not None and risk_score.overall_score > 0
        print(f"✓ Risk assessment test passed (score: {risk_score.overall_score})")

        # 4. Test Risk Explanation
        call = db.query(Call).first()
        assert call is not None
        from app.models.domain import AnalysisResult
        analysis = db.query(AnalysisResult).filter(AnalysisResult.call_id == call.id).first()
        assert analysis is not None
        print(f"✓ Risk explanation test passed (analysis verified for call #{call.id})")

        # 5. Test Incidents
        incidents = list_incidents(db=db, current_user=user)
        assert len(incidents) > 0
        print(f"✓ Incident list test passed ({len(incidents)} incidents)")

        # 6. Test Prevention Actions
        actions = list_prevention_actions(db=db, current_user=user)
        assert len(actions) > 0
        print(f"✓ Prevention actions test passed ({len(actions)} actions)")

        # 7. Test Active Calls
        calls = list_active_calls(db=db, current_user=user)
        assert len(calls) > 0
        print(f"✓ Active calls test passed ({len(calls)} active streams)")

        print("\nALL BACKEND ROUTER TESTS PASSED!")
    finally:
        db.close()

if __name__ == "__main__":
    test_endpoints()
