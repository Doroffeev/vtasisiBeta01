import React, { useState } from 'react';
import { LineChart, BarChart3, Scale, Droplets, Activity, Filter, AlertCircle, Package, X } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
}

interface Medication {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  invoiceNumber: string;
  remainingQuantity: number;
}

interface TreatmentAnimal {
  id: string;
  number: string;
  startDate: string;
  diagnosis: string;
  isActive: boolean;
}

interface MastitisAnimal {
  id: string;
  number: string;
  diagnosisDate: string;
  type: 'послеродовой' | 'клинический' | 'субклинический';
  isActive: boolean;
}

const Monitoring: React.FC = () => {
  const [dateRange, setDateRange] = useState('week');
  const [showTreatmentList, setShowTreatmentList] = useState(false);
  const [showMastitisList, setShowMastitisList] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState({
    weight: true,
    milk: true,
    health: true,
    treatment: true
  });

  // Mock data for medications
  const medications: Medication[] = [
    {
      id: '1',
      name: 'Антибиотик А',
      quantity: 100,
      unitPrice: 150,
      invoiceNumber: 'INV-001',
      remainingQuantity: 85
    },
    {
      id: '2',
      name: 'Вакцина B',
      quantity: 50,
      unitPrice: 300,
      invoiceNumber: 'INV-002',
      remainingQuantity: 42
    },
    {
      id: '3',
      name: 'Витамин C',
      quantity: 200,
      unitPrice: 80,
      invoiceNumber: 'INV-003',
      remainingQuantity: 156
    }
  ];

  // Mock data for animals under treatment
  const [treatmentAnimals] = useState<TreatmentAnimal[]>([
    {
      id: '1',
      number: '0122',
      startDate: '2024-03-01',
      diagnosis: 'Мастит',
      isActive: true
    },
    {
      id: '2',
      number: '0123',
      startDate: '2024-03-05',
      diagnosis: 'Хромота',
      isActive: true
    },
    {
      id: '3',
      number: '0124',
      startDate: '2024-03-10',
      diagnosis: 'Эндометрит',
      isActive: true
    }
  ]);

  // Mock data for animals with mastitis
  const [mastitisAnimals] = useState<MastitisAnimal[]>([
    {
      id: '1',
      number: '0125',
      diagnosisDate: '2024-03-15',
      type: 'послеродовой',
      isActive: true
    },
    {
      id: '2',
      number: '0126',
      diagnosisDate: '2024-03-10',
      type: 'клинический',
      isActive: true
    }
  ]);

  const totalInventoryValue = medications.reduce((sum, med) => 
    sum + (med.remainingQuantity * med.unitPrice), 0
  );

  const metrics: MetricCard[] = [
    {
      title: 'Средний удой',
      value: '23.5 л',
      change: '+2.3%',
      isPositive: true,
      icon: <Droplets className="h-6 w-6 text-blue-500" />
    },
    {
      title: 'Средний вес',
      value: '584 кг',
      change: '+1.2%',
      isPositive: true,
      icon: <Scale className="h-6 w-6 text-green-500" />
    },
    {
      title: 'На лечении',
      value: `${treatmentAnimals.filter(a => a.isActive).length} голов`,
      change: '-15%',
      isPositive: true,
      icon: <Activity className="h-6 w-6 text-red-500" />
    },
    {
      title: 'Мастит',
      value: `${mastitisAnimals.filter(a => a.isActive).length} голов`,
      change: '+2',
      isPositive: false,
      icon: <AlertCircle className="h-6 w-6 text-orange-500" />
    }
  ];

  const Modal: React.FC<{
    title: string;
    onClose: () => void;
    children: React.ReactNode;
  }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Мониторинг</h1>
        <div className="flex space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="day">За день</option>
            <option value="week">За неделю</option>
            <option value="month">За месяц</option>
            <option value="year">За год</option>
          </select>
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center">
            <Filter size={20} className="mr-2" />
            Фильтры
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div 
            key={index} 
            className={`bg-white rounded-lg shadow p-6 ${
              (metric.title === 'На лечении' || metric.title === 'Мастит') ? 
              'cursor-pointer hover:bg-gray-50' : ''
            }`}
            onClick={() => {
              if (metric.title === 'На лечении') setShowTreatmentList(true);
              if (metric.title === 'Мастит') setShowMastitisList(true);
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-full bg-gray-50">{metric.icon}</div>
              <span className={`text-sm font-medium ${
                metric.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.change}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">{metric.title}</h3>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{metric.value}</p>
          </div>
        ))}
      </div>

      {showTreatmentList && (
        <Modal 
          title="Животные на лечении" 
          onClose={() => setShowTreatmentList(false)}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">№ животного</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата начала</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дней на лечении</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Диагноз</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {treatmentAnimals.map(animal => {
                  const daysInTreatment = differenceInDays(
                    new Date(),
                    new Date(animal.startDate)
                  );
                  
                  return (
                    <tr key={animal.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{animal.number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(animal.startDate), 'dd.MM.yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{daysInTreatment}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{animal.diagnosis}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          animal.isActive ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {animal.isActive ? 'На лечении' : 'Вылечено'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {showMastitisList && (
        <Modal 
          title="Животные с маститом" 
          onClose={() => setShowMastitisList(false)}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">№ животного</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата диагноза</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дней болезни</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип мастита</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mastitisAnimals.map(animal => {
                  const daysSinceDiagnosis = differenceInDays(
                    new Date(),
                    new Date(animal.diagnosisDate)
                  );
                  
                  return (
                    <tr key={animal.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{animal.number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(animal.diagnosisDate), 'dd.MM.yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{daysSinceDiagnosis}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          animal.type === 'послеродовой' ? 'bg-purple-100 text-purple-800' :
                          animal.type === 'клинический' ? 'bg-red-100 text-red-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {animal.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          animal.isActive ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {animal.isActive ? 'Болеет' : 'Вылечено'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Динамика удоя</h2>
          </div>
          <div className="p-4">
            <div className="h-80 flex items-center justify-center text-gray-500">
              <LineChart size={32} />
              <span className="ml-2">График удоя</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Распределение по группам</h2>
          </div>
          <div className="p-4">
            <div className="h-80 flex items-center justify-center text-gray-500">
              <BarChart3 size={32} />
              <span className="ml-2">График распределения</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Остатки ветеринарных препаратов</h2>
          <div className="flex items-center">
            <Package className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-lg font-medium text-gray-900">
              Общая стоимость: {totalInventoryValue.toLocaleString()}₽
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Наименование</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Остаток</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена за ед.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Общая стоимость</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% остатка</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {medications.map((medication) => {
                const remainingPercentage = (medication.remainingQuantity / medication.quantity) * 100;
                const totalValue = medication.remainingQuantity * medication.unitPrice;
                
                return (
                  <tr key={medication.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{medication.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {medication.remainingQuantity} / {medication.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{medication.unitPrice}₽</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{totalValue.toLocaleString()}₽</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                          <div 
                            className={`h-2.5 rounded-full ${
                              remainingPercentage > 70 ? 'bg-green-500' :
                              remainingPercentage > 30 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${remainingPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500">{Math.round(remainingPercentage)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Показатели здоровья стада</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Группа</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Количество</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Средний вес</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Средний удой</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Здоровье</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Дойные коровы</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">125</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">584 кг</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">23.5 л</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">98%</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Сухостойные</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">45</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">612 кг</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">100%</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Нетели</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">38</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">425 кг</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">95%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;