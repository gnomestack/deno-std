

export function parseCommand(command: string): IToken[] {
    return command.split(' ').map((token) => {
        if (token === '|') {
            return { type: 'pipe', value: token };
        } else if (token === '<' || token === '>') {
            return { type: 'redirect', value: token };
        } else if (token === '(') {
            return { type: 'subshell', value: token };
        } else if (token === ')') {
            return { type: 'subshellEnd', value: token };
        } else {
            return { type: 'command', value: token };
        }
    });
}
export interface IToken {
    type: 'command' | 'argument' | 'pipe' | 'redirect' | 'subshell' | 'subshellEnd';
    value: string;
}

export async function jsShell(scripts: string[], ...args: string[]) {

    for(var i = 0; i < scripts.length; i++) {
        const script = scripts[i];

        for(var j= 0; j < args.length; j++) {
            script.replace(`{{${j}}}`, args[j])
        }
    }

}