export interface Amanu {
    id: number;
    type: string;
    title: string;
    date: string; // DateOnly from .NET → use string in Angular
    theme?: string;
    scripture?: string;
    reading?: string;
    content: string;
    createdBy: string;
    modifiedBy?: string;
    createdAt: string; // DateTime → string
    modifiedAt: string;
}
