from bootstrap_model import ensure_model
from app import create_app

ensure_model()

app = create_app()
