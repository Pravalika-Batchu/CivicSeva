import logging
import re
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from hygiene.models import Department

# Initialize logger
logger = logging.getLogger(__name__)

User = get_user_model()

def validate_phone_number(phone_number):
    """Validate phone number in E.164 format (e.g., +1234567890)."""
    if not phone_number:
        return False
    return bool(re.match(r'^\+\d{10,15}$', phone_number))

@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def get_departments(request):
    try:
        departments = Department.objects.all().values('id', 'name', 'contact_phone')
        logger.debug(f"Returning departments: {list(departments)}")
        return Response(list(departments), status=200)
    except Exception as e:
        logger.error(f"Error fetching departments: {str(e)}")
        return Response({'error': 'Failed to fetch departments'}, status=500)

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def register_citizen(request):
    username = request.data.get('username')
    password = request.data.get('password')
    phone_number = request.data.get('phone_number')

    if not username or not password or not phone_number:
        logger.error("Missing required fields")
        return Response({'error': 'Username, password, and phone number required'}, status=400)

    if not validate_phone_number(phone_number):
        logger.error(f"Invalid phone number: {phone_number}")
        return Response({'error': 'Phone number must be in E.164 format (e.g., +1234567890)'}, status=400)

    if User.objects.filter(username=username).exists():
        logger.error(f"Username already exists: {username}")
        return Response({'error': 'Username already exists'}, status=400)

    try:
        user = User.objects.create_user(
            username=username,
            password=password,
            role="CITIZEN",
            is_staff=False,
            is_superuser=False,
            phone_number=phone_number
        )
        logger.info(f"Citizen registered: {username}")
        return Response({'message': 'Citizen registered successfully'}, status=201)
    except Exception as e:
        logger.error(f"Error creating citizen: {str(e)}")
        return Response({'error': 'Registration failed due to server error'}, status=500)

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def register_officer(request):
    logger.info(f"Received registration request: {request.data}")
    username = request.data.get('username')
    password = request.data.get('password')
    department_id = request.data.get('department')
    phone_number = request.data.get('phone_number')

    if not username or not password or not department_id or not phone_number:
        logger.error("Missing required fields")
        return Response({'error': 'Username, password, department, and phone number required'}, status=400)

    if not validate_phone_number(phone_number):
        logger.error(f"Invalid phone number: {phone_number}")
        return Response({'error': 'Phone number must be in E.164 format (e.g., +1234567890)'}, status=400)

    if User.objects.filter(username=username).exists():
        logger.error(f"Username already exists: {username}")
        return Response({'error': 'Username already exists'}, status=400)

    try:
        dept = Department.objects.get(id=department_id)
        logger.debug(f"Found department: {dept.name} (ID: {department_id})")
    except Department.DoesNotExist:
        logger.error(f"Invalid department ID: {department_id}")
        return Response({'error': 'Invalid department ID'}, status=400)

    try:
        user = User.objects.create_user(
            username=username,
            password=password,
            role="DEPT_OFFICER",
            department=dept,
            is_staff=True,
            is_superuser=False,
            phone_number=phone_number
        )
        logger.info(f"Officer registered: {username} under {dept.name}")
        return Response({'message': f'Department Officer registered under {dept.name}'}, status=201)
    except Exception as e:
        logger.error(f"Error creating officer: {str(e)}")
        return Response({'error': 'Registration failed due to server error'}, status=500)
@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_admin(request):
    if request.user.role != "ADMIN":
        logger.error(f"Unauthorized admin registration attempt by {request.user.username}")
        return Response({'error': 'Only admins can create new admins'}, status=403)
    username = request.data.get('username')
    password = request.data.get('password')
    phone_number = request.data.get('phone_number')

    if not username or not password or not phone_number:
        logger.error("Missing required fields")
        return Response({'error': 'Username, password, and phone number required'}, status=400)

    if not validate_phone_number(phone_number):
        logger.error(f"Invalid phone number: {phone_number}")
        return Response({'error': 'Phone number must be in E.164 format (e.g., +1234567890)'}, status=400)

    if User.objects.filter(username=username).exists():
        logger.error(f"Username already exists: {username}")
        return Response({'error': 'Username already exists'}, status=400)

    try:
        user = User.objects.create_user(
            username=username,
            password=password,
            role="ADMIN",
            is_staff=True,
            is_superuser=True,
            phone_number=phone_number
        )
        logger.info(f"Admin registered: {username}")
        return Response({'message': 'Admin registered successfully'}, status=201)
    except Exception as e:
        logger.error(f"Error creating admin: {str(e)}")
        return Response({'error': 'Registration failed due to server error'}, status=500)

from django.middleware.csrf import get_token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def login_user(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        logger.error("Missing username or password")
        return Response({'error': 'Username and password required'}, status=400)

    user = authenticate(username=username, password=password)
    if user is not None:
        refresh = RefreshToken.for_user(user)
        logger.info(f"User {username} logged in")
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'role': user.role,
            'department': user.department.name if user.department else None,
            'username': user.username,
            'phone_number': user.phone_number
        }, status=200)
    else:
        logger.error(f"Invalid credentials for {username}")
        return Response({'error': 'Invalid credentials'}, status=401)
    


@api_view(['GET'])
@permission_classes([AllowAny])
def get_csrf_token(request):
    csrf_token = get_token(request)
    response = Response({'csrfToken': csrf_token})
    response.set_cookie('csrftoken', csrf_token, secure=False, httponly=False, samesite='Lax')
    return response