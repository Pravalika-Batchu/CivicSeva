from hygiene.models import Issue
from hygiene.notifications import WhatsAppNotifier

issue = Issue.objects.get(id=47)  # use a real issue ID
WhatsAppNotifier.notify_user_status_update(issue)
