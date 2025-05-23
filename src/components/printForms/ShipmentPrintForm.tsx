import React from 'react';
import { format } from 'date-fns';
import { Shipment } from '../../contexts/ShipmentsContext';

interface ShipmentPrintFormProps {
  shipment: Shipment;
}

const ShipmentPrintForm: React.FC<ShipmentPrintFormProps> = ({ shipment }) => {
  // Расчет общей суммы отгрузки
  const calculateTotal = () => {
    if (shipment.totalAmount) {
      return shipment.totalAmount;
    }

    if (shipment.animals && shipment.animals.length > 0) {
      return shipment.animals.reduce((total, animal) => {
        return total + (animal.price || 0) * (animal.weight || 1);
      }, 0);
    }

    // Для обратной совместимости
    if (shipment.price && shipment.weight) {
      return shipment.price * shipment.weight;
    }

    return 0;
  };

  return (
    <div className="print-only" style={{ display: 'none' }}>
      <div id="shipment-print-form">
        <div className="report-header">
          <h1 className="report-title text-center">НАКЛАДНАЯ НА ОТГРУЗКУ ЖИВОТНЫХ</h1>
          <p className="text-center">№ {shipment.id.substring(0, 8)} от {format(new Date(shipment.date), 'dd.MM.yyyy')}</p>
        </div>

        <table className="mb-4 w-full">
          <tbody>
            <tr>
              <td className="font-bold" width="200">Отправитель:</td>
              <td>СПК "Большевик"</td>
            </tr>
            <tr>
              <td className="font-bold">Получатель:</td>
              <td>{shipment.buyerName || shipment.buyerId}</td>
            </tr>
            <tr>
              <td className="font-bold">Номер доверенности:</td>
              <td>{shipment.proxyNumber}</td>
            </tr>
            <tr>
              <td className="font-bold">Транспортное средство:</td>
              <td>{shipment.vehicleNumber}</td>
            </tr>
            <tr>
              <td className="font-bold">Водитель:</td>
              <td>{shipment.driverName}</td>
            </tr>
          </tbody>
        </table>

        <table className="mb-8 w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black p-2">№</th>
              <th className="border border-black p-2">№ животного</th>
              <th className="border border-black p-2">Вес (кг)</th>
              <th className="border border-black p-2">Цена (руб.)</th>
              <th className="border border-black p-2">Стоимость (руб.)</th>
            </tr>
          </thead>
          <tbody>
            {shipment.animals && shipment.animals.length > 0 ? (
              // Если есть массив animals, отображаем все животные
              shipment.animals.map((animal, index) => (
                <tr key={animal.id || index}>
                  <td className="border border-black p-2 text-center">{index + 1}</td>
                  <td className="border border-black p-2">{animal.animalNumber}</td>
                  <td className="border border-black p-2 text-right">{animal.weight ? animal.weight.toLocaleString() : '-'}</td>
                  <td className="border border-black p-2 text-right">{animal.price ? animal.price.toLocaleString() : '-'}</td>
                  <td className="border border-black p-2 text-right">
                    {animal.price && animal.weight
                      ? (animal.price * animal.weight).toLocaleString()
                      : '-'
                    }
                  </td>
                </tr>
              ))
            ) : (
              // Для обратной совместимости используем данные отдельного animal
              <tr>
                <td className="border border-black p-2 text-center">1</td>
                <td className="border border-black p-2">{shipment.animalNumber || shipment.animalId}</td>
                <td className="border border-black p-2 text-right">{shipment.weight ? shipment.weight.toLocaleString() : '-'}</td>
                <td className="border border-black p-2 text-right">{shipment.price ? shipment.price.toLocaleString() : '-'}</td>
                <td className="border border-black p-2 text-right">
                  {shipment.price && shipment.weight
                    ? (shipment.price * shipment.weight).toLocaleString()
                    : '-'
                  }
                </td>
              </tr>
            )}
            <tr className="total-row">
              <td colSpan={4} className="border border-black p-2 text-right font-bold">ИТОГО:</td>
              <td className="border border-black p-2 text-right font-bold">
                {calculateTotal().toLocaleString()} руб.
              </td>
            </tr>
          </tbody>
        </table>
        
        {shipment.comments && (
          <div className="mb-8">
            <div className="font-bold">Примечания:</div>
            <p>{shipment.comments}</p>
          </div>
        )}

        <div className="signatures">
          <div>
            <p>Отпуск произвел: {shipment.releaserName || shipment.releasedById}</p>
            <div className="signature-line">Подпись</div>
            <p className="mt-10">М.П.</p>
          </div>
          <div>
            <p>Принял: {shipment.acceptedBy}</p>
            <div className="signature-line">Подпись</div>
            <p className="mt-10">М.П.</p>
          </div>
        </div>

        <div className="mt-8 text-xs">
          <p>Дата печати: {format(new Date(), 'dd.MM.yyyy HH:mm:ss')}</p>
        </div>
      </div>
    </div>
  );
};

export default ShipmentPrintForm;