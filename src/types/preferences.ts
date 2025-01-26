export interface ThemeColors {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    accent: string;
    error: string;
}

export interface Theme {
    id: string;
    name: string;
    colors: ThemeColors;
}

export interface Preferences {
    theme: string;  // theme id
    customThemes: Theme[];
}

export const DEFAULT_THEMES: Theme[] = [
    {
        id: 'dark',
        name: 'Dark Theme',
        colors: {
            background: '#2c2c2c',
            surface: '#363636',
            primary: '#7289da',
            secondary: '#4f545c',
            text: '#ffffff',
            textSecondary: '#999999',
            accent: '#43b581',
            error: '#f04747'
        }
    },
    {
        id: 'dracula',
        name: 'Dracula',
        colors: {
            background: '#282a36',
            surface: '#44475a',
            primary: '#bd93f9',
            secondary: '#6272a4',
            text: '#f8f8f2',
            textSecondary: '#a7aab7',
            accent: '#50fa7b',
            error: '#ff5555'
        }
    },
    {
        id: 'monokai',
        name: 'Monokai Dark',
        colors: {
            background: '#272822',
            surface: '#3e3d32',
            primary: '#a6e22e',
            secondary: '#49483e',
            text: '#f8f8f2',
            textSecondary: '#a59f85',
            accent: '#66d9ef',
            error: '#f92672'
        }
    },
    {
        id: 'nord',
        name: 'Nord Dark',
        colors: {
            background: '#2e3440',
            surface: '#3b4252',
            primary: '#88c0d0',
            secondary: '#4c566a',
            text: '#eceff4',
            textSecondary: '#d8dee9',
            accent: '#a3be8c',
            error: '#bf616a'
        }
    },
    {
        id: 'github-dark',
        name: 'GitHub Dark',
        colors: {
            background: '#0d1117',
            surface: '#161b22',
            primary: '#58a6ff',
            secondary: '#30363d',
            text: '#c9d1d9',
            textSecondary: '#8b949e',
            accent: '#238636',
            error: '#f85149'
        }
    },
    {
        id: 'light',
        name: 'Light Theme',
        colors: {
            background: '#ffffff',
            surface: '#f5f5f5',
            primary: '#5865f2',
            secondary: '#e3e5e8',
            text: '#2c2c2c',
            textSecondary: '#666666',
            accent: '#3ba55c',
            error: '#ed4245'
        }
    }
]; 