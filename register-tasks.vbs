Set service = CreateObject("Schedule.Service")
service.Connect

Dim rootFolder
Set rootFolder = service.GetFolder("\")

' ── Helper to delete existing task ──────────────────────
Sub DeleteIfExists(name)
    On Error Resume Next
    rootFolder.DeleteTask name, 0
    On Error GoTo 0
End Sub

' ── Task 1: RDS-Hub-Server (at logon, 30s delay) ────────
DeleteIfExists "RDS-Hub-Server"
Dim t1
Set t1 = service.NewTask(0)
t1.RegistrationInfo.Description = "RDS Hub - Start PM2 server on login"

Dim tr1
Set tr1 = t1.Triggers.Create(9) ' TASK_TRIGGER_LOGON
tr1.Delay = "PT30S"
tr1.Enabled = True

Dim a1
Set a1 = t1.Actions.Create(0) ' TASK_ACTION_EXEC
a1.Path = "C:\Users\HP\rds-project-hub\start-rds-server.bat"

t1.Settings.Enabled = True
t1.Settings.StartWhenAvailable = False
t1.Principal.RunLevel = 0 ' TASK_RUNLEVEL_LUA (least privilege)

rootFolder.RegisterTaskDefinition "RDS-Hub-Server", t1, 6, "", "", 3, ""
' 6=TASK_CREATE_OR_UPDATE, 3=TASK_LOGON_INTERACTIVE_TOKEN

' ── Task 2: RDS-Hub-Sync-Boot (at logon, 1min delay) ────
DeleteIfExists "RDS-Hub-Sync-Boot"
Dim t2
Set t2 = service.NewTask(0)
t2.RegistrationInfo.Description = "RDS Hub - Sync once on login"

Dim tr2
Set tr2 = t2.Triggers.Create(9) ' TASK_TRIGGER_LOGON
tr2.Delay = "PT1M"
tr2.Enabled = True

Dim a2
Set a2 = t2.Actions.Create(0)
a2.Path = "wscript.exe"
a2.Arguments = """C:\Users\HP\rds-project-hub\sync-silent.vbs"""

t2.Settings.Enabled = True
t2.Principal.RunLevel = 0

rootFolder.RegisterTaskDefinition "RDS-Hub-Sync-Boot", t2, 6, "", "", 3, ""

' ── Task 3: RDS-Hub-Sync-5min (every 5 minutes) ─────────
DeleteIfExists "RDS-Hub-Sync-5min"
Dim t3
Set t3 = service.NewTask(0)
t3.RegistrationInfo.Description = "RDS Hub - Sync every 5 minutes"

Dim tr3
Set tr3 = t3.Triggers.Create(1) ' TASK_TRIGGER_TIME
tr3.StartBoundary = "2026-07-15T00:00:00"
tr3.Repetition.Interval = "PT5M"
tr3.Repetition.StopAtDurationEnd = False
tr3.Enabled = True

Dim a3
Set a3 = t3.Actions.Create(0)
a3.Path = "wscript.exe"
a3.Arguments = """C:\Users\HP\rds-project-hub\sync-silent.vbs"""

t3.Settings.Enabled = True
t3.Settings.StartWhenAvailable = True
t3.Principal.RunLevel = 0

rootFolder.RegisterTaskDefinition "RDS-Hub-Sync-5min", t3, 6, "", "", 3, ""

MsgBox "Done! All 3 RDS-Hub tasks registered:" & vbCrLf & _
       "  RDS-Hub-Server (logon +30s)" & vbCrLf & _
       "  RDS-Hub-Sync-Boot (logon +1min)" & vbCrLf & _
       "  RDS-Hub-Sync-5min (every 5min)", vbInformation, "RDS Hub Setup"
