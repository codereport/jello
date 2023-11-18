import subprocess
from colorama import init, Fore, Style

def cprint(s: str, c):
    print(Style.BRIGHT + c + s + Fore.RESET)

def run_jelly(expr: str, arg: str):
    try:
        command = ['jelly', 'eun', expr, arg]
        result = subprocess.run(command, text=True, capture_output=True, check=True)
        output_text = result.stdout.strip()

        cprint("   " + output_text, Fore.GREEN)

    except subprocess.CalledProcessError as e:
        # Print the stderr output for more information about the error
        print(Fore.RED + f"Error: {e}")
        print(Fore.RED + "stderr:", e.stderr)

def to_jelly(token: str) -> str:
    if token == 'iota': return 'R'
    if token == 'rev':  return 'Ṛ'

def convert(expr: list[str]) -> str:
    return ''.join([to_jelly(t) for t in expr])

if __name__ == "__main__":
    init() # folor colorama

    print('JELLO')

    while True:
        expr = input('> ').strip().split()
        arg = expr[-1]
        converted_expr = convert(expr[:-1])
        cprint("   " + converted_expr, Fore.YELLOW)

        run_jelly(converted_expr, arg)
