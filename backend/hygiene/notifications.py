# notifications.py
import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class WhatsAppNotifier:
    WHATSAPP_TOKEN = 'EAATGhewWwZBkBQsZBryHiEWUoiKG9NUOIclD3AHkDbinFfn3JIRkCEtjikyvB5yddpHBuDYFWZBksq9p9pApuOagW3U6yH9fpc4k40ZAEEGZBO9a1azPwIFxl7xj9aFNqBEBeXdst0TxA9jCUi1iFArm68BGqq3mQ5B20fJwaavTlVnbuFycsP3IiU0WbYVC6XNkdbthS9QC68KakPgHu1qN762idvMMZCulDC7gknHhpZCNnmKqewKZAXosq4ZB9bMHLDU8ZCxvj3D1oWcBmaZAWQk8FBq'
    PHONE_NUMBER_ID = '785662747963620'
    BASE_URL = f"https://graph.facebook.com/v22.0/{PHONE_NUMBER_ID}/messages"

    @classmethod
    def send_request(cls, payload):
        headers = {
            "Authorization": f"Bearer {cls.WHATSAPP_TOKEN}",
            "Content-Type": "application/json"
        }
        try:
            response = requests.post(cls.BASE_URL, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            logger.info(f"WhatsApp response: {data}")
            return data
        except Exception as e:
            logger.exception(f"Error sending WhatsApp request: {e}")
            return None

    @classmethod
    def send_text_message(cls, phone_number, message):
        """
        Send a generic text message to a specific phone number.
        """
        payload = {
            "messaging_product": "whatsapp",
            "to": phone_number,
            "type": "text",
            "text": {"body": message}
        }
        return cls.send_request(payload)

    @classmethod
    def confirm_whatsapp_submission(cls, citizen_number, title, location):
        """
        Notify the citizen who submitted an issue using an approved template.
        """
        payload = {
            "messaging_product": "whatsapp",
            "to": citizen_number,
            "type": "template",
            "template": {
                "name": "hello_world",   # your approved template
                "language": {"code": "en_US"},
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": title},
                            {"type": "text", "text": location}
                        ]
                    }
                ]
            }
        }
        return cls.send_request(payload)

    @classmethod
    def notify_department_emergency(cls, issue):
        """
        Send HIGH severity alerts to the department's main WhatsApp number.
        """
        if not issue.department:
            logger.warning(f"Issue {issue.id} has no department assigned.")
            return

        dept_number = getattr(issue.department, "contact_phone", None)
        if not dept_number:
            logger.warning(f"Department {issue.department.name} has no phone number assigned.")
            return

        message = (
            f"⚠️ New HIGH Severity Issue!\n"
            f"Title: {issue.title}\n"
            f"Severity: {issue.severity}\n"
            f"Reported By: {issue.citizen.username}\n"
            f"Location: {issue.latitude}, {issue.longitude}\n"
            f"Description: {issue.description}"
        )

        payload = {
            "messaging_product": "whatsapp",
            "to": dept_number,
            "type": "text",
            "text": {"body": message}
        }
        cls.send_request(payload)



    @classmethod
    def notify_user_status_update(cls, issue):
        """
        Free-form status update notification for citizen.
        """
        if not issue.citizen.phone_number:
            print("NO phone number for citizen; skipping status update notification")
            return
        print(issue.citizen.phone_number)

        message = (
            f"📢 Update on your reported issue:\n"
            f"Title: {issue.title}\n"
            f"New Status: {issue.status}\n"
            f"Remarks: {issue.remarks or 'No remarks'}"
        )

        payload = {
            "messaging_product": "whatsapp",
            "to": issue.citizen.phone_number,
            "type": "text",
            "text": {"body": message}
        }
        cls.send_request(payload)
        