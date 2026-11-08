from typing import Any, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_db, get_current_active_user
from app.models.domain import User, Call, Alert, Incident, ThreatIndicator

router = APIRouter()

class SearchResultItem(BaseModel):
    category: str # call, alert, incident, threat_indicator
    id: str
    title: str
    subtitle: str
    severity: str
    link_target: str

class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResultItem]

@router.get("", response_model=SearchResponse)
def global_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    results: List[SearchResultItem] = []
    term = f"%{q.strip().lower()}%"

    # Search Calls
    calls = db.query(Call).filter(
        (Call.caller_number.ilike(term)) | (Call.receiver_number.ilike(term))
    ).limit(10).all()
    for c in calls:
        results.append(SearchResultItem(
            category="call",
            id=str(c.id),
            title=f"Call #{c.id}: {c.caller_number} → {c.receiver_number}",
            subtitle=f"Status: {c.status} | Risk Level: {c.risk_level}",
            severity=c.risk_level or "low",
            link_target=f"/calls/{c.id}"
        ))

    # Search Alerts
    alerts = db.query(Alert).filter(
        (Alert.title.ilike(term)) | (Alert.message.ilike(term)) | (Alert.alert_type.ilike(term))
    ).limit(10).all()
    for a in alerts:
        results.append(SearchResultItem(
            category="alert",
            id=str(a.id),
            title=f"Alert #{a.id}: {a.title}",
            subtitle=a.message[:80] + "...",
            severity=a.severity or "medium",
            link_target=f"/alerts/{a.id}"
        ))

    # Search Incidents
    incidents = db.query(Incident).filter(
        (Incident.incident_number.ilike(term)) | (Incident.title.ilike(term)) | (Incident.summary.ilike(term))
    ).limit(10).all()
    for inc in incidents:
        results.append(SearchResultItem(
            category="incident",
            id=str(inc.id),
            title=f"{inc.incident_number}: {inc.title}",
            subtitle=f"Status: {inc.status} | Priority: {inc.priority}",
            severity=inc.severity or "high",
            link_target=f"/incidents/{inc.id}"
        ))

    # Search Threat Indicators
    indicators = db.query(ThreatIndicator).filter(
        (ThreatIndicator.indicator_value.ilike(term)) | (ThreatIndicator.source.ilike(term))
    ).limit(10).all()
    for ind in indicators:
        results.append(SearchResultItem(
            category="threat_indicator",
            id=str(ind.id),
            title=f"Threat Indicator: {ind.indicator_value}",
            subtitle=f"Type: {ind.indicator_type} | Reputation: {ind.reputation}",
            severity=ind.severity or "medium",
            link_target=f"/threats/{ind.id}"
        ))

    return SearchResponse(
        query=q,
        total_results=len(results),
        results=results
    )

