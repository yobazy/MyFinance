"""
OAuth Authentication API Views
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.shortcuts import redirect
from django.conf import settings
import requests
import json

User = get_user_model()


@api_view(['GET'])
@permission_classes([AllowAny])
def oauth_login(request, provider):
    """
    Initiate OAuth login flow
    provider: 'google' or 'github'
    """
    if provider not in ['google', 'github']:
        return Response({'error': 'Invalid provider'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Build OAuth URL
    if provider == 'google':
        client_id = settings.SOCIALACCOUNT_PROVIDERS['google']['APP']['client_id']
        redirect_uri = request.build_absolute_uri('/api/auth/callback/google/')
        scope = 'openid email profile'
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={client_id}&"
            f"redirect_uri={redirect_uri}&"
            f"response_type=code&"
            f"scope={scope}&"
            f"access_type=online"
        )
    elif provider == 'github':
        client_id = settings.SOCIALACCOUNT_PROVIDERS['github']['APP']['client_id']
        redirect_uri = request.build_absolute_uri('/api/auth/callback/github/')
        scope = 'user:email'
        auth_url = (
            f"https://github.com/login/oauth/authorize?"
            f"client_id={client_id}&"
            f"redirect_uri={redirect_uri}&"
            f"scope={scope}"
        )
    
    return Response({'auth_url': auth_url})


@api_view(['GET'])
@permission_classes([AllowAny])
def oauth_callback(request, provider):
    """
    Handle OAuth callback and create/authenticate user
    """
    code = request.GET.get('code')
    if not code:
        return Response({'error': 'Authorization code not provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        if provider == 'google':
            user = handle_google_callback(code, request)
        elif provider == 'github':
            user = handle_github_callback(code, request)
        else:
            return Response({'error': 'Invalid provider'}, status=status.HTTP_400_BAD_REQUEST)
        
        if user:
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Redirect to frontend with tokens
            frontend_url = request.GET.get('redirect_uri', 'http://localhost:3000')
            redirect_url = f"{frontend_url}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
            return redirect(redirect_url)
        else:
            return Response({'error': 'Failed to authenticate'}, status=status.HTTP_401_UNAUTHORIZED)
    
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def handle_google_callback(code, request):
    """Handle Google OAuth callback"""
    client_id = settings.SOCIALACCOUNT_PROVIDERS['google']['APP']['client_id']
    client_secret = settings.SOCIALACCOUNT_PROVIDERS['google']['APP']['secret']
    redirect_uri = request.build_absolute_uri('/api/auth/callback/google/')
    
    # Exchange code for token
    token_url = 'https://oauth2.googleapis.com/token'
    token_data = {
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code',
    }
    
    token_response = requests.post(token_url, data=token_data)
    token_response.raise_for_status()
    tokens = token_response.json()
    access_token = tokens['access_token']
    
    # Get user info
    user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
    headers = {'Authorization': f'Bearer {access_token}'}
    user_info_response = requests.get(user_info_url, headers=headers)
    user_info_response.raise_for_status()
    user_info = user_info_response.json()
    
    # Create or get user
    email = user_info.get('email')
    if not email:
        return None
    
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': email.split('@')[0],
            'first_name': user_info.get('given_name', ''),
            'last_name': user_info.get('family_name', ''),
        }
    )
    
    if not created:
        # Update user info
        user.first_name = user_info.get('given_name', user.first_name)
        user.last_name = user_info.get('family_name', user.last_name)
        user.save()
    
    return user


def handle_github_callback(code, request):
    """Handle GitHub OAuth callback"""
    client_id = settings.SOCIALACCOUNT_PROVIDERS['github']['APP']['client_id']
    client_secret = settings.SOCIALACCOUNT_PROVIDERS['github']['APP']['secret']
    redirect_uri = request.build_absolute_uri('/api/auth/callback/github/')
    
    # Exchange code for token
    token_url = 'https://github.com/login/oauth/access_token'
    token_data = {
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri,
    }
    headers = {'Accept': 'application/json'}
    
    token_response = requests.post(token_url, data=token_data, headers=headers)
    token_response.raise_for_status()
    tokens = token_response.json()
    access_token = tokens['access_token']
    
    # Get user info
    user_info_url = 'https://api.github.com/user'
    headers = {'Authorization': f'token {access_token}'}
    user_info_response = requests.get(user_info_url, headers=headers)
    user_info_response.raise_for_status()
    user_info = user_info_response.json()
    
    # Get email (may need to fetch from emails endpoint)
    email = user_info.get('email')
    if not email:
        emails_url = 'https://api.github.com/user/emails'
        emails_response = requests.get(emails_url, headers=headers)
        if emails_response.status_code == 200:
            emails = emails_response.json()
            primary_email = next((e for e in emails if e.get('primary')), None)
            if primary_email:
                email = primary_email.get('email')
    
    if not email:
        return None
    
    # Create or get user
    username = user_info.get('login', email.split('@')[0])
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': username,
            'first_name': user_info.get('name', '').split()[0] if user_info.get('name') else '',
            'last_name': ' '.join(user_info.get('name', '').split()[1:]) if user_info.get('name') else '',
        }
    )
    
    if not created:
        # Update user info
        if user_info.get('name'):
            name_parts = user_info['name'].split()
            user.first_name = name_parts[0] if name_parts else user.first_name
            user.last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else user.last_name
        user.save()
    
    return user


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """Get current authenticated user info"""
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout user (blacklist refresh token)"""
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token_view(request):
    """Refresh JWT access token"""
    try:
        refresh_token = request.data.get('refresh_token')
        if not refresh_token:
            return Response({'error': 'Refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
        
        token = RefreshToken(refresh_token)
        access_token = str(token.access_token)
        return Response({
            'access_token': access_token,
            'refresh_token': str(token),
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
