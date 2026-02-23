from datetime import datetime, timezone

def iso_a_utc_naive(dt: datetime) -> datetime:
    """Convierte datetime con tz a UTC sin tzinfo (naive).
    Si ya viene naive, se regresa tal cual.
    """
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)
