from app import create_app
from models import AppPackage

app = create_app()
with app.app_context():
    count = AppPackage.query.count()
    print(f"Total apps in DB: {count}")
    apps = AppPackage.query.all()
    for app_item in apps:
        print(f"- {app_item.name}: {app_item.package}")
