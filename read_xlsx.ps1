$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('D:\EOM DASHBOARDS PROTO\WIP_Review_ALL_20260506.xlsx')

foreach ($ws in $wb.Sheets) {
    Write-Host "=== Sheet: $($ws.Name) ==="
    $ur = $ws.UsedRange
    Write-Host "Rows: $($ur.Rows.Count)  Cols: $($ur.Columns.Count)"
    
    $headers = @()
    for ($c = 1; $c -le $ur.Columns.Count; $c++) {
        $headers += $ws.Cells.Item(1, $c).Text
    }
    Write-Host "Headers: $($headers -join ' | ')"
    
    $maxRow = [Math]::Min(6, $ur.Rows.Count)
    for ($r = 2; $r -le $maxRow; $r++) {
        $row = @()
        for ($c = 1; $c -le $ur.Columns.Count; $c++) {
            $row += $ws.Cells.Item($r, $c).Text
        }
        Write-Host "Row ${r}: $($row -join ' | ')"
    }
    Write-Host ""
}

$wb.Close($false)
$excel.Quit()
