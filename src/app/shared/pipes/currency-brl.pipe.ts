import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencyBrl', standalone: true })
export class CurrencyBrlPipe implements PipeTransform {
  private formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  transform(value: number | null | undefined): string {
    if (value == null) return 'R$ 0,00';
    return this.formatter.format(value);
  }
}
