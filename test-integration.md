# Testing Real vs Demo Deployments

## Quick Test Steps:

1. **Check Settings Page** - Verify providers show "Connected"
2. **Deploy a Repository** - Should now use real tokens if connected
3. **Check Deployment Status** - Should show "Real deployment" message

## What Changed:

### Backend Fixes:
- ✅ Deployment service now checks for real provider tokens
- ✅ Uses stored user tokens instead of hardcoded demo tokens  
- ✅ Distinguishes between real and demo deployments
- ✅ Proper status messages for real vs demo deployments

### Frontend Fixes:
- ✅ Clear messaging about real vs demo deployments
- ✅ Better instructions for enabling real deployments

## Expected Behavior:

**If Real Token Connected:**
- Message: "🚀 REAL Deployment Started! Using your connected [provider] account"
- Status: "deploying" or "deployed"
- URL: Real deployment URL (not demo)

**If Demo Mode:**
- Message: "🎯 Demo Deployment Started! This is demonstration only"
- Status: "demo_deployment" or "demo_complete"
- URL: Demo URL with "-demo" suffix

## Debug Info:

The deployment service now:
1. Checks `provider_integrations` table for user's stored tokens
2. Validates token is not demo mode (`!tokenData.demo`)
3. Validates token is not placeholder (`!== 'demo-[provider]-token'`)
4. Uses real token if available, falls back to demo if not
5. Sets proper status and messages based on deployment type
