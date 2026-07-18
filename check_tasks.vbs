Set service = CreateObject("Schedule.Service")
service.Connect

Dim rootFolder
Set rootFolder = service.GetFolder("\")

Dim tasks
Set tasks = rootFolder.GetTasks(0)

Dim result
result = "=== ALL Windows Scheduled Tasks ===" & vbCrLf & vbCrLf

Dim i
For i = 1 To tasks.Count
  Dim t
  Set t = tasks.Item(i)
  result = result & "Name: " & t.Name & vbCrLf
  result = result & "State: " & t.State & vbCrLf

  ' Get actions
  Dim def
  Set def = t.Definition
  Dim acts
  Set acts = def.Actions
  Dim j
  For j = 1 To acts.Count
    Dim act
    Set act = acts.Item(j)
    result = result & "Action: " & act.Path & " " & act.Arguments & vbCrLf
  Next
  result = result & "---" & vbCrLf
Next

' Write to file
Dim fso
Set fso = CreateObject("Scripting.FileSystemObject")
Dim f
Set f = fso.CreateTextFile("C:\Users\HP\rds-project-hub\task_list.txt", True)
f.Write result
f.Close

MsgBox "Done! Check task_list.txt", vbInformation, "Task Check"
