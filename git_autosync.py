import subprocess
import time
import os
import sys

def run_cmd(cmd, timeout=60):
    try:
        result = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=timeout)
        return result.returncode, result.stdout.strip(), result.stderr.strip()
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out"

def get_git_status():
    code, out, err = run_cmd("git status --porcelain")
    if code != 0:
        return None
    return out

def main():
    print("Git Auto-Sync started. Monitoring changes...")
    last_status = ""
    change_detected_time = None
    debounce_interval = 10 # seconds
    
    while True:
        try:
            status = get_git_status()
            if status is None:
                # Git command failed
                time.sleep(10)
                continue
                
            if status:
                # There are changes!
                if status != last_status:
                    # New changes detected or changes modified
                    last_status = status
                    change_detected_time = time.time()
                    print(f"Change detected at {time.strftime('%H:%M:%S')}. Waiting to stabilize...")
                else:
                    # Changes are the same as last check
                    if change_detected_time and (time.time() - change_detected_time >= debounce_interval):
                        print("Changes stabilized. Staging and committing...")
                        # Run git add, commit, and push
                        run_cmd("git add -A")
                        
                        # Parse files to build a nice commit message
                        short_files = []
                        for line in status.split('\n'):
                            if len(line) > 3:
                                # git status --porcelain format: XY path/to/file -> path/to/file or path/to/file
                                file_path = line[3:].strip()
                                # Keep just the filename
                                short_files.append(os.path.basename(file_path))
                                
                        commit_msg = f"Auto-commit: updated {', '.join(short_files[:3])}"
                        if len(short_files) > 3:
                            commit_msg += f" and {len(short_files) - 3} other files"
                        
                        code, out, err = run_cmd(f'git commit -m "{commit_msg}"')
                        print(f"Commit output: {out} {err}")
                        
                        print("Pushing to remote origin main...")
                        code, out, err = run_cmd("git push origin main")
                        print(f"Push output: {out} {err}")
                        
                        last_status = ""
                        change_detected_time = None
            else:
                # No changes
                last_status = ""
                change_detected_time = None
                
            time.sleep(5)
        except KeyboardInterrupt:
            print("Exiting...")
            break
        except Exception as e:
            print(f"Error in main loop: {e}")
            time.sleep(10)

if __name__ == "__main__":
    main()
