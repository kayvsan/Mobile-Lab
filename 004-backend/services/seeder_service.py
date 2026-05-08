from models import db, AppPackage

def seed_app_packages():
    """Seed initial app packages if table is empty"""
    if AppPackage.query.count() > 0:
        return

    common_apps = [
        {"name": "WhatsApp", "package": "com.whatsapp"},
        {"name": "Instagram", "package": "com.instagram.android"},
        {"name": "Spotify", "package": "com.spotify.music"},
        {"name": "TikTok", "package": "com.ss.android.ugc.trill"},
        {"name": "Discord", "package": "com.discord"},
        {"name": "Trello", "package": "com.trello"},
        {"name": "DeepSeek", "package": "com.deepseek.chat"},
        {"name": "ChatGPT", "package": "com.openai.chatgpt"},
        {"name": "Zoom", "package": "us.zoom.videomeetings"},
        {"name": "Shopee", "package": "com.shopee.id"},
        {"name": "Tokopedia", "package": "com.tokopedia.tkpd"},
        {"name": "Gojek", "package": "com.gojek.app"},
        {"name": "Dana", "package": "id.dana", "region": "Indonesia"},
        {"name": "BCA Mobile", "package": "com.bca", "region": "Indonesia"},
        {"name": "Alfamart Alfagift", "package": "com.alfamart.alfagift"},
        {"name": "Indomaret Klik Indomaret", "package": "com.indomaret.klikindomaret"},
        {"name": "Tiket.com", "package": "com.tiket.gits"}
    ]

    for app in common_apps:
        new_app = AppPackage(
            name=app["name"],
            package=app["package"],
            region=app.get("region")
        )
        db.session.add(new_app)
    
    db.session.commit()
    print(f"Seeded {len(common_apps)} app packages.")
