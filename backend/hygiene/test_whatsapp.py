from hygiene.models import Issue
from hygiene.notifications import WhatsAppNotifier

if __name__ == "__main__":
    try:
        issue = Issue.objects.get(id=47)  # use a real issue ID
        WhatsAppNotifier.notify_user_status_update(issue)
    except Exception as e:
        print(f"WhatsApp test skipped: {e}")
