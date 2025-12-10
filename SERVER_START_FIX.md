# 🔧 Server Not Starting - Quick Fix

## ❌ Problem
`npm start` is stuck/hanging and not showing output.

---

## 🔍 Common Causes

1. **MongoDB connection hanging** - Server waiting for DB connection
2. **Build outdated** - `dist/` folder needs rebuild
3. **Port already in use** - Another process using port 3030
4. **Missing environment variables** - MongoDB URI not set

---

## ✅ Quick Fixes

### Fix 1: Rebuild and Restart

```bash
# Stop any running processes (Ctrl+C)

# Clean and rebuild
npm run clean
npm run build

# Start server
npm start
```

### Fix 2: Check MongoDB Connection

**If MongoDB is not running or connection string is wrong:**

```bash
# Check if MongoDB URI is set
echo $MONGODB_URI

# Or check .env file
cat .env | grep MONGODB_URI
```

**The server will start even if MongoDB fails, but it might hang during connection attempt.**

### Fix 3: Use Dev Mode (Better for Development)

```bash
# Instead of npm start, use:
npm run dev

# This shows real-time logs and auto-restarts on changes
```

### Fix 4: Check Port Availability

```bash
# Check if port 3030 is in use
lsof -i :3030

# Kill process if needed
kill -9 <PID>
```

### Fix 5: Run with Explicit Output

```bash
# Run directly to see errors
node dist/app.js

# Or with environment
NODE_ENV=production node dist/app.js
```

---

## 🚀 Recommended: Use Dev Mode

**For development, always use:**

```bash
npm run dev
```

**Benefits:**
- ✅ Real-time TypeScript compilation
- ✅ Auto-restart on file changes
- ✅ Better error messages
- ✅ No need to rebuild manually

---

## 🔧 If Server Starts But No Output

**Check logs:**

```bash
# Server should show:
✅ Server is running on 0.0.0.0:3030
Environment: production
Connected to MongoDB
```

**If you don't see these logs:**
1. Check MongoDB connection string
2. Check environment variables
3. Check for errors in console

---

## 📋 Complete Restart Process

```bash
# 1. Stop current process (Ctrl+C)

# 2. Clean build
npm run clean

# 3. Rebuild
npm run build

# 4. Check for errors
npm run build 2>&1 | grep -i error

# 5. Start server
npm start

# OR use dev mode (recommended)
npm run dev
```

---

## 🐛 Debug Steps

### Step 1: Check Build
```bash
npm run build
# Should complete without errors
```

### Step 2: Check dist/app.js exists
```bash
ls -la dist/app.js
# Should exist
```

### Step 3: Run directly
```bash
node dist/app.js
# Should show server starting logs
```

### Step 4: Check MongoDB
```bash
# Test MongoDB connection string
# Server will start even if MongoDB fails, but might hang
```

---

## 💡 Quick Solution

**Just use dev mode:**

```bash
npm run dev
```

**This is better for development and shows all logs immediately!**

---

## ✅ Expected Output

When server starts successfully, you should see:

```
Starting server on 0.0.0.0:3030 (PORT env: not set)
✅ Server is running on 0.0.0.0:3030
Environment: production
Connected to MongoDB
Payment reminder cron job scheduled (daily at 9:00 AM)
Automatic payment record generation cron job scheduled (daily at 8:00 AM)
Monthly rental payment checker cron job scheduled (daily at 10:00 AM)
```

---

**Try `npm run dev` instead - it's better for development!** 🚀

