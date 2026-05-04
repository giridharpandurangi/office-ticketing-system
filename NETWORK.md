# Network & Access Guide

## Local Network Setup

### Option 1: Same WiFi Network

**Best for most offices with WiFi**

1. **Find your laptop IP address:**
   ```bash
   # Windows (PowerShell/CMD)
   ipconfig
   ```
   Look for "IPv4 Address" like `192.168.1.100`

2. **Share with team:**
   ```
   http://192.168.1.100:3000
   ```

3. **Users just visit the URL and login**

### Option 2: Corporate Network

If your office has a corporate network:

1. Ask IT to add your laptop to the network
2. Get your IP from IT or use `ipconfig`
3. Share the URL as above

### Option 3: Direct WiFi Hotspot

If no WiFi available:

1. **Turn on WiFi hotspot on your laptop**
   - Windows: Settings → Network → Hotspot
   
2. **Users connect to your hotspot**

3. **Share the URL with the port**

## Firewall Configuration

### Windows Firewall

If users can't access:

1. Open **Windows Defender Firewall** → Advanced Settings
2. Click **Inbound Rules** → New Rule
3. Select **Port** → **TCP** → Specific ports: `3000,5000`
4. Action: **Allow**
5. Name it "Ticketing System"

### macOS/Linux

```bash
# macOS (allow ports)
sudo pfctl -f /etc/pf.conf

# Linux (UFW)
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp
```

## Troubleshooting Access Issues

### Users can't reach the app

1. **Check laptop IP is correct:**
   ```bash
   ipconfig
   ```

2. **Verify backend is running:**
   - Should see "Server running on port 5000"

3. **Check firewall:**
   - Windows Firewall might be blocking
   - Temporarily disable to test

4. **Test locally first:**
   - Visit `http://localhost:3000` on your laptop
   - Should work fine

5. **Check they're on same network:**
   - Both devices should be on same WiFi

### Database connection issues

If backend crashes on startup:

1. **Verify PostgreSQL is running:**
   - Windows: Check Services
   - macOS: `brew services list`
   - Linux: `sudo systemctl status postgresql`

2. **Check .env DATABASE_URL:**
   ```
   postgresql://postgres:YOUR_PASSWORD@localhost:5432/ticketing_db
   ```

3. **Verify database exists:**
   ```bash
   createdb ticketing_db
   ```

### Port conflicts

If port 3000 or 5000 already in use:

1. **Find what's using it:**
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # macOS/Linux
   lsof -i :3000
   ```

2. **Kill the process:**
   ```bash
   # Windows
   taskkill /PID <PID> /F
   
   # macOS/Linux
   kill -9 <PID>
   ```

3. **Or use different ports:**
   - Edit `backend/server.js` and change port
   - Run frontend on different port: `PORT=3001 npm start`

## Best Practices

✅ **Do:**
- Keep passwords strong
- Change default admin password first
- Regular database backups
- Monitor laptop performance
- Use dedicated laptop if possible

❌ **Don't:**
- Leave system running 24/7 (laptop battery/heat)
- Expose to public internet
- Use weak passwords
- Share admin credentials

## Performance Tips

1. **Stop services when not needed:**
   - Reduces laptop load
   - Saves battery

2. **Optimize database:**
   - More users = consider adding indexes
   - Large databases = regular backups

3. **Monitor connections:**
   - Don't have 100 users active simultaneously
   - Stagger access during office hours

## Data Backup

### Manual Backup

```bash
# Create backup
pg_dump -U postgres ticketing_db > backup-$(date +%Y%m%d).sql

# Restore from backup
psql -U postgres ticketing_db < backup-20260505.sql
```

### Automated Backup (Windows Task Scheduler)

1. Create a `.bat` file:
   ```batch
   @echo off
   pg_dump -U postgres ticketing_db > "C:\Backups\ticketing_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sql"
   ```

2. Schedule in Task Scheduler to run daily

## Disaster Recovery

If something breaks:

1. **Database corrupted:**
   ```bash
   psql -U postgres ticketing_db < last_backup.sql
   ```

2. **Data loss:**
   - Restore from backup
   - Use most recent backup file

3. **Complete failure:**
   - Reinstall PostgreSQL
   - Recreate database
   - Restore from backup

---

For setup help, see [QUICKSTART.md](QUICKSTART.md)  
For technical details, see [ARCHITECTURE.md](ARCHITECTURE.md)
