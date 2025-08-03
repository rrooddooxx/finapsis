export type Serie = {
    fecha: string;
    valor: number;
}

export type MarketIndicatorResponse = {
    version: string;
    autor: string;
    codigo: string;
    nombre: string;
    unidad_medida: string;
    serie: Serie[];
}