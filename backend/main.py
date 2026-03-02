import os
import subprocess
import psutil
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

app = FastAPI(title="Bot Web Interface API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to bot's .env and bot script
ENV_PATH = "/root/.env"
BOT_SERVICE = "telegram-bot.service"

class EnvVar(BaseModel):
    key: str
    value: str

@app.get("/api/status")
async def get_status():
    """Return systemd service status and resource usage."""
    result = subprocess.run(
        ["systemctl", "is-active", BOT_SERVICE],
        capture_output=True,
        text=True
    )
    running = result.stdout.strip() == "active"

    # Get CPU and memory usage of the bot process
    cpu, mem = 0.0, 0.0
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info']):
        if proc.info['name'] and 'python' in proc.info['name']:
            try:
                cmdline = proc.cmdline()
                if any('simple_bot.py' in arg for arg in cmdline):
                    cpu = proc.cpu_percent(interval=0.1)
                    mem = proc.memory_info().rss / (1024 * 1024)
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

    return {
        "running": running,
        "cpu_usage": cpu,
        "memory_usage": mem
    }

@app.post("/api/start")
async def start_bot():
    """Start the bot via systemctl."""
    result = subprocess.run(["systemctl", "start", BOT_SERVICE], capture_output=True)
    return {"success": result.returncode == 0, "message": "Bot started"}

@app.post("/api/stop")
async def stop_bot():
    """Stop the bot via systemctl."""
    result = subprocess.run(["systemctl", "stop", BOT_SERVICE], capture_output=True)
    return {"success": result.returncode == 0, "message": "Bot stopped"}

@app.post("/api/restart")
async def restart_bot():
    """Restart the bot via systemctl."""
    result = subprocess.run(["systemctl", "restart", BOT_SERVICE], capture_output=True)
    return {"success": result.returncode == 0, "message": "Bot restarted"}

@app.get("/api/logs")
async def get_logs(limit: int = 100):
    """Return last N lines of journalctl logs for the bot service."""
    result = subprocess.run(
        ["journalctl", "-u", BOT_SERVICE, "-n", str(limit), "--no-pager"],
        capture_output=True,
        text=True
    )
    return {"logs": result.stdout}

@app.get("/api/env")
async def get_env():
    """Return current environment variables from .env file."""
    env = {}
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    key, val = line.strip().split("=", 1)
                    env[key] = val
    return {"env": env}

@app.post("/api/env")
async def save_env(env_vars: dict):
    """Save environment variables to .env file."""
    try:
        with open(ENV_PATH, "w") as f:
            for key, val in env_vars.items():
                f.write(f"{key}={val}\n")
        # Optionally restart bot after env change
        subprocess.run(["systemctl", "restart", BOT_SERVICE])
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
