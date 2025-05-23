import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FileText, 
  Activity, 
  CreditCard, 
  Heart, 
  Package, 
  Truck, 
  Calendar, 
  Move, 
  AlertCircle, 
  Search, 
  Filter,
  Printer,
  Download,
  ExternalLink
} from 'lucide-react';

type ReportCategory = 'all' | 'animals' | 'health' | 'inventory' | 'financial';

interface ReportItem {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  modulePath: string;
  reportParam?: string;
  icon: React.ReactNode;
  isNew?: boolean;
}

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('all');

  // Определение списка доступных отчетов из различных модулей
  const reports: ReportItem[] = [
    {
      id: 'calving_journal',
      title: 'Журнал отелов',
      description: 'Список всех отелов с информацией о матери, потомстве, дате и исполнителе',
      category: 'animals',
      modulePath: '/calvings',
      reportParam: 'report=calving_journal',
      icon: <Calendar className="h-6 w-6 text-purple-500" />
    },
    {
      id: 'herd_movement',
      title: 'Движение поголовья',
      description: 'Перемещения животных между группами с указанием дат и причин',
      category: 'animals',
      modulePath: '/herd-movement',
      reportParam: 'report=movement_history',
      icon: <Move className="h-6 w-6 text-blue-500" />
    },
    {
      id: 'insemination_journal',
      title: 'Журнал осеменений',
      description: 'Список осеменений с указанием животного, быка и результата',
      category: 'animals',
      modulePath: '/insemination',
      reportParam: 'report=insemination_journal',
      icon: <Heart className="h-6 w-6 text-red-500" />
    },
    {
      id: 'pregnancy_tests',
      title: 'Тесты на стельность',
      description: 'Результаты тестов на стельность с указанием дат и результатов',
      category: 'health',
      modulePath: '/pregnancy-test',
      reportParam: 'report=results_journal',
      icon: <Activity className="h-6 w-6 text-green-500" />
    },
    {
      id: 'missed_treatments',
      title: 'Пропущенные процедуры',
      description: 'Список пропущенных этапов лечения, требующих внимания',
      category: 'health',
      modulePath: '/treatment-schemes',
      reportParam: 'report=missed_treatment',
      icon: <AlertCircle className="h-6 w-6 text-red-500" />
    },
    {
      id: 'medications_inventory',
      title: 'Остатки препаратов',
      description: 'Инвентаризация ветеринарных препаратов с указанием остатков и сроков годности',
      category: 'inventory',
      modulePath: '/medications',
      reportParam: 'report=inventory',
      icon: <Package className="h-6 w-6 text-blue-500" />
    },
    {
      id: 'medications_expiry',
      title: 'Сроки годности препаратов',
      description: 'Отчет по препаратам с истекающим сроком годности',
      category: 'inventory',
      modulePath: '/medications',
      reportParam: 'report=expiry',
      icon: <AlertCircle className="h-6 w-6 text-orange-500" />
    },
    {
      id: 'vet_operations',
      title: 'Ветеринарные операции',
      description: 'Список проведенных ветеринарных операций с указанием животных и исполнителей',
      category: 'health',
      modulePath: '/vet-operations',
      reportParam: 'report=operations_journal',
      icon: <Activity className="h-6 w-6 text-purple-500" />
    },
    {
      id: 'shipping_journal',
      title: 'Журнал отгрузок',
      description: 'Информация об отгрузках животных с указанием дат, покупателей и параметров',
      category: 'financial',
      modulePath: '/shipping',
      reportParam: 'report=shipping_journal',
      icon: <Truck className="h-6 w-6 text-blue-500" />
    },
    {
      id: 'financial_summary',
      title: 'Финансовый отчет',
      description: 'Сводный отчет по финансовым показателям хозяйства',
      category: 'financial',
      modulePath: '/shipping',
      reportParam: 'report=financial',
      icon: <CreditCard className="h-6 w-6 text-green-500" />,
      isNew: true
    },
    {
      id: 'treatment_efficiency',
      title: 'Эффективность лечения',
      description: 'Анализ эффективности различных схем лечения',
      category: 'health',
      modulePath: '/treatment-schemes',
      reportParam: 'report=efficiency',
      icon: <Activity className="h-6 w-6 text-indigo-500" />,
      isNew: true
    }
  ];

  // Фильтрация отчетов по категории и поисковому запросу
  const filteredReports = reports.filter(report => {
    const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory;
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          report.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Функция для навигации к отчету
  const navigateToReport = (report: ReportItem) => {
    navigate(`${report.modulePath}?${report.reportParam || ''}`);
  };

  // Получение количества отчетов по категориям для отображения счетчиков
  const getCategoryCount = (category: ReportCategory) => {
    if (category === 'all') return reports.length;
    return reports.filter(report => report.category === category).length;
  };

  // Преобразование ID категории в читаемое название
  const getCategoryLabel = (category: ReportCategory) => {
    switch (category) {
      case 'animals': return 'Животноводство';
      case 'health': return 'Здоровье';
      case 'inventory': return 'Инвентарь';
      case 'financial': return 'Финансы';
      default: return 'Все отчеты';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Отчеты</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => {
              // Здесь может быть логика для печати текущего отчета, если выбран
            }}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center"
          >
            <Printer size={20} className="mr-2" />
            Печать
          </button>
          <button
            onClick={() => {
              // Здесь может быть логика для экспорта текущего отчета, если выбран
            }}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center"
          >
            <Download size={20} className="mr-2" />
            Экспорт
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Поиск */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Поиск отчета..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
            
            {/* Фильтр по категориям */}
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">Категория:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ReportCategory)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">Все категории ({getCategoryCount('all')})</option>
                <option value="animals">Животноводство ({getCategoryCount('animals')})</option>
                <option value="health">Здоровье ({getCategoryCount('health')})</option>
                <option value="inventory">Инвентарь ({getCategoryCount('inventory')})</option>
                <option value="financial">Финансы ({getCategoryCount('financial')})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Список отчетов */}
        <div className="p-6">
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Отчеты не найдены</h3>
              <p className="mt-2 text-sm text-gray-500">
                Попробуйте изменить параметры поиска или выбрать другую категорию.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReports.map(report => (
                <div
                  key={report.id}
                  onClick={() => navigateToReport(report)}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {report.icon}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">{report.title}</h3>
                        {report.isNew && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Новый
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{report.description}</p>
                      <div className="mt-3 flex items-center text-sm text-blue-600">
                        <span className="font-medium">Открыть отчет</span>
                        <ExternalLink className="ml-1 h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {getCategoryLabel(report.category)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Модуль: {report.modulePath.replace('/', '')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;