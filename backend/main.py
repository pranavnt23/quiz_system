import uvicorn
from mpi4py import MPI
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
import websocket_manager
from routes.quiz_crud import router as quiz_router

# Initialize Database
Base.metadata.create_all(bind=engine)

comm = MPI.COMM_WORLD
rank = comm.Get_rank()
size = comm.Get_size()

print(f"Running rank {rank}")

if rank == 0:
    # ------------------ SERVER ------------------
    app = FastAPI(title="Quiz System Backend")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(quiz_router, prefix="/api/quiz")

    websocket_manager.initialize(comm, size)
    app.include_router(websocket_manager.router)

    print("Rank 0: Starting FastAPI server on port 8000")

    uvicorn.run(app, host="127.0.0.1", port=8000)

else:
    # ------------------ WORKERS ------------------
    from mpi_worker import worker_loop

    print(f"Rank {rank}: Starting worker loop")
    worker_loop(comm, rank)
