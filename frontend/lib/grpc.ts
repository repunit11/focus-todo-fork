import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const protoPath = path.resolve(process.cwd(), '../proto/focus_todo/v1/focus_todo.proto');
const pkgDef = protoLoader.loadSync(protoPath, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const proto = grpc.loadPackageDefinition(pkgDef) as any;

const backendAddr = process.env.GRPC_BACKEND_ADDR ?? 'backend:9090';

const timerClient = new proto.focus_todo.v1.TimerService(backendAddr, grpc.credentials.createInsecure());
const taskClient = new proto.focus_todo.v1.TaskService(backendAddr, grpc.credentials.createInsecure());
const statsClient = new proto.focus_todo.v1.StatsService(backendAddr, grpc.credentials.createInsecure());
const settingsClient = new proto.focus_todo.v1.SettingsService(backendAddr, grpc.credentials.createInsecure());

function unary<TReq, TRes>(client: any, method: string, req: TReq): Promise<TRes> {
  return new Promise((resolve, reject) => {
    client[method](req, (err: grpc.ServiceError | null, resp: TRes) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(resp);
    });
  });
}

export const grpcApi = {
  startSession: () => unary(timerClient, 'startSession', {}),
  pauseSession: () => unary(timerClient, 'pauseSession', {}),
  resumeSession: () => unary(timerClient, 'resumeSession', {}),
  stopSession: () => unary(timerClient, 'stopSession', {}),
  resetSession: () => unary(timerClient, 'resetSession', {}),
  getActiveSession: () => unary(timerClient, 'getActiveSession', {}),
  createTask: (req: any) => unary(taskClient, 'createTask', req),
  listTasks: (includeCompleted: boolean) => unary(taskClient, 'listTasks', { includeCompleted }),
  updateTask: (req: any) => unary(taskClient, 'updateTask', req),
  completeTask: (id: string) => unary(taskClient, 'completeTask', { id }),
  deleteTask: (id: string) => unary(taskClient, 'deleteTask', { id }),
  dailyStats: () => unary(statsClient, 'getDailyStats', {}),
  weeklyStats: () => unary(statsClient, 'getWeeklyStats', {}),
  monthlyStats: () => unary(statsClient, 'getMonthlyStats', {}),
  logFocusSession: (focusSeconds: number, completedPomodoro: boolean) =>
    unary(statsClient, 'logFocusSession', { focusSeconds, completedPomodoro }),
  getSettings: () => unary(settingsClient, 'getPomodoroSettings', {}),
  updateSettings: (settings: any) => unary(settingsClient, 'updatePomodoroSettings', settings)
};
