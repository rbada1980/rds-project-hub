Dim http, result

' Test 1: GET /api/settings
Set http = CreateObject("MSXML2.XMLHTTP")
http.open "GET", "https://hub.rdsprojects.com/api/settings", False
http.send
result = "=== GET /api/settings ===" & vbCrLf
result = result & "Status: " & http.status & vbCrLf
result = result & "Response (first 500 chars): " & Left(http.responseText, 500) & vbCrLf & vbCrLf

' Test 2: POST /api/settings/upsert
Dim payload
payload = "{""key"":""test_billing_save"",""value"":""\""ok\""""}"
http.open "POST", "https://hub.rdsprojects.com/api/settings/upsert", False
http.setRequestHeader "Content-Type", "application/json"
http.send payload
result = result & "=== POST /api/settings/upsert ===" & vbCrLf
result = result & "Status: " & http.status & vbCrLf
result = result & "Response: " & http.responseText & vbCrLf

' Write results
Dim fso, f
Set fso = CreateObject("Scripting.FileSystemObject")
Set f = fso.CreateTextFile("C:\Users\HP\rds-project-hub\api_test_result.txt", True)
f.Write result
f.Close

MsgBox "API test done! Check api_test_result.txt", 64, "API Test"
