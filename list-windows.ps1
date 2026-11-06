Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class Win32List {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    public static void ListAll() {
        EnumWindows((hWnd, lParam) => {
            StringBuilder sb = new StringBuilder(512);
            GetWindowText(hWnd, sb, 512);
            string title = sb.ToString();
            if (!string.IsNullOrEmpty(title)) {
                Console.WriteLine("Title: " + title);
            }
            return true;
        }, IntPtr.Zero);
    }
}
"@

[Win32List]::ListAll()
