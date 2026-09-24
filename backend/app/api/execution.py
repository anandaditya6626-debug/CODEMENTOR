import asyncio
import logging
import time
import traceback
from typing import Optional
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from app.services.execution_service import execution_service, InteractiveExecutionSession

router = APIRouter()
logger = logging.getLogger(__name__)


class ExecuteRequest(BaseModel):
    code: str
    language: str
    stdin: str = ""
    time_limit: Optional[float] = 5.0


class ExecuteResponse(BaseModel):
    status: str
    stdout: str
    stderr: str
    compile_output: str
    time: Optional[str] = None
    memory: Optional[int] = None
    error: str = ""
    exit_code: Optional[int] = None


@router.get("/runtimes")
async def get_runtimes():
    """Return all supported languages, live availability, and runtime metadata."""
    languages = execution_service.get_languages_metadata()
    return {
        "judge0_enabled": execution_service.use_judge0,
        "languages": languages,
    }


@router.post("/", response_model=ExecuteResponse)
async def execute_code_direct(req: ExecuteRequest):
    """Execute code in the configured execution engine (local or Judge0, non-interactive batch)."""
    try:
        result = await execution_service.execute_code(
            code=req.code,
            language=req.language,
            stdin=req.stdin,
            time_limit=min(req.time_limit or 5.0, 10.0)
        )
        logger.info(f"Execution result: status={result.get('status')}, exit_code={result.get('exit_code')}")
        return ExecuteResponse(**result)
    except Exception as e:
        logger.error(f"Execution error: {traceback.format_exc()}")
        return ExecuteResponse(
            status='error', stdout='', stderr=str(e),
            compile_output='', error=str(e), exit_code=-1
        )


@router.websocket("/ws")
async def websocket_execute(websocket: WebSocket):
    """Interactive streaming execution over persistent WebSocket."""
    await websocket.accept()
    session: Optional[InteractiveExecutionSession] = None
    output_tasks: list[asyncio.Task] = []
    watcher_task: Optional[asyncio.Task] = None

    async def stream_output(reader: asyncio.StreamReader, stream_name: str):
        try:
            while True:
                chunk = await reader.read(1024)
                if not chunk:
                    break
                text = chunk.decode("utf-8", errors="replace")
                await websocket.send_json({"type": stream_name, "data": text})
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.debug(f"Stream {stream_name} closed: {e}")

    try:
        while True:
            msg = await websocket.receive_json()
            msg_type = msg.get("type")
            print(f"[WS-SERVER] Received: type={msg_type}", flush=True)

            if msg_type == "start":
                print(f"[WS-SERVER] Starting execution: lang={msg.get('language')}", flush=True)
                # Clean up any previously active session
                if session and session.is_running:
                    await session.stop()
                    for t in output_tasks:
                        t.cancel()
                    if watcher_task and not watcher_task.done():
                        watcher_task.cancel()
                    session.cleanup()

                code = msg.get("code", "")
                language = msg.get("language", "python")
                stdin_data = msg.get("stdin", "")
                time_limit = float(msg.get("time_limit", 60.0))

                session = execution_service.create_interactive_session(
                    code=code,
                    language=language,
                    initial_stdin=stdin_data,
                    time_limit=time_limit
                )

                # Prepare (compile C/C++ if needed)
                prep_err = await session.prepare()
                if prep_err:
                    if prep_err.get("compile_output"):
                        await websocket.send_json({
                            "type": "compile_output",
                            "data": prep_err["compile_output"]
                        })
                    await websocket.send_json({
                        "type": "exit",
                        "status": prep_err.get("status", "compilation_error"),
                        "exit_code": prep_err.get("exit_code", 1),
                        "error": prep_err.get("error", "Compilation failed")
                    })
                    session.cleanup()
                    session = None
                    continue

                # Spawn process
                try:
                    await session.start()
                except Exception as e:
                    await websocket.send_json({
                        "type": "exit",
                        "status": "error",
                        "error": str(e),
                        "exit_code": -1
                    })
                    session.cleanup()
                    session = None
                    continue

                await websocket.send_json({"type": "status", "status": "running"})

                # Start reader tasks
                stdout_task = asyncio.create_task(stream_output(session.proc.stdout, "stdout"))
                stderr_task = asyncio.create_task(stream_output(session.proc.stderr, "stderr"))
                output_tasks = [stdout_task, stderr_task]

                # Start watcher task
                async def watch_process(current_session: InteractiveExecutionSession):
                    t0 = current_session.start_time or time.perf_counter()
                    try:
                        await asyncio.wait_for(current_session.proc.wait(), timeout=current_session.time_limit)
                        # Wait for stdout and stderr to finish streaming
                        await asyncio.gather(*output_tasks, return_exceptions=True)
                        if current_session.stopped_by_user:
                            return
                        elapsed = time.perf_counter() - t0
                        status = "success" if current_session.proc.returncode == 0 else "runtime_error" 
                        print(f"[WS-SERVER] Process finished, sending exit: status={status}, code={current_session.proc.returncode}", flush=True)
                        await websocket.send_json({
                            "type": "exit",
                            "status": status,
                            "exit_code": current_session.proc.returncode,
                            "time": f"{elapsed:.3f}"
                        })
                    except asyncio.TimeoutError:
                        await current_session.stop()
                        elapsed = time.perf_counter() - t0
                        await websocket.send_json({
                            "type": "stderr",
                            "data": f"\n[Time Limit Exceeded ({current_session.time_limit}s)]\n"
                        })
                        await websocket.send_json({
                            "type": "exit",
                            "status": "time_limit_exceeded",
                            "exit_code": -1,
                            "time": f"{elapsed:.3f}"
                        })
                    except asyncio.CancelledError:
                        pass
                    except Exception as e:
                        logger.error(f"Watcher error: {e}")
                    finally:
                        current_session.is_running = False

                watcher_task = asyncio.create_task(watch_process(session))

            elif msg_type == "stdin":
                if session and session.is_running:
                    input_text = msg.get("data", "")
                    await session.write_stdin(input_text)

            elif msg_type == "stop":
                if session and session.is_running:
                    session.stopped_by_user = True
                    if watcher_task and not watcher_task.done():
                        watcher_task.cancel()
                    await session.stop()
                    for t in output_tasks:
                        t.cancel()
                    await websocket.send_json({
                        "type": "stderr",
                        "data": "\n[Execution stopped by user]\n"
                    })
                    await websocket.send_json({
                        "type": "exit",
                        "status": "stopped",
                        "exit_code": -1
                    })
                    session.cleanup()
                    session = None

    except WebSocketDisconnect as ws_disc:
        print(f"[WS-SERVER] Disconnected: code={ws_disc.code}", flush=True)
        logger.info("Interactive compiler WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket unhandled error: {e}")
    finally:
        if session and session.is_running:
            await session.stop()
        for t in output_tasks:
            t.cancel()
        if watcher_task and not watcher_task.done():
            watcher_task.cancel()
        if session:
            session.cleanup()
