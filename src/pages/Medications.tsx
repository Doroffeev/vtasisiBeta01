import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, Download, Upload, Trash2, X, MinusCircle, History, FileText, Printer, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertTriangle } from 'lucide-react';
import { saveAs } from 'file-saver';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { useNomenclature, categoryLabels } from '../contexts/NomenclatureContext';
import { useMedications } from '../contexts/MedicationsContext';
import { useUser } from '../contexts/UserContext';

const Medications: React.FC = () => {
  const { items: nomenclatureItems, addItem: addNomenclatureItem, isLoading: nomenclatureLoading, error: nomenclatureError } = useNomenclature();
  const { medications, addMedication, writeOffMedication, deleteMedication, isLoading: medicationsLoading, error: medicationsError } = useMedications();
  const { getUsersByRole, currentUser } = useUser();
  
  const [showForm, setShowForm] = useState(false);
  const [showNomenclatureForm, setShowNomenclatureForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showWriteOffForm, setShowWriteOffForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [medicationToDelete, setMedicationToDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Состояния для фильтрации отчета
  const [reportFilters, setReportFilters] = useState({
    category: '',
    expiryDateFrom: '',
    expiryDateTo: '',
    batchNumber: ''
  });
  
  // Состояния для пагинации
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [writeOffData, setWriteOffData] = useState({
    medicationId: '',
    quantity: 0,
    reason: '',
    executorId: ''
  });

  const [newNomenclature, setNewNomenclature] = useState({
    code: '',
    name: '',
    unit: 'шт' as const,
    category: 'АНТИБИОТИК' as const
  });

  const [newMedication, setNewMedication] = useState({
    nomenclatureId: '',
    quantity: 0,
    unitPrice: 0,
    invoiceNumber: '',
    receiptDate: format(new Date(), 'yyyy-MM-dd'),
    expiryDate: '',
    batchNumber: '',
    supplier: ''
  });

  // Получаем активных пользователей с ролью VET для списания препаратов
  const veterinarians = getUsersByRole('VET');

  // Проверка, является ли текущий пользователь администратором
  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    // Сбрасываем страницу пагинации при изменении фильтров
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);
  
  const handleReportFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setReportFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleWriteOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await writeOffMedication(writeOffData);
      setWriteOffData({
        medicationId: '',
        quantity: 0,
        reason: '',
        executorId: ''
      });
      setShowWriteOffForm(false);
    } catch (error) {
      alert(error.message || 'Произошла ошибка при списании');
    }
  };

  const handleNomenclatureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (newNomenclature.code && newNomenclature.name) {
        await addNomenclatureItem(newNomenclature);
        setNewNomenclature({
          code: '',
          name: '',
          unit: 'шт',
          category: 'АНТИБИОТИК'
        });
        setShowNomenclatureForm(false);
      }
    } catch (error) {
      alert(error.message || 'Произошла ошибка при добавлении номенклатуры');
    }
  };

  const handleMedicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (newMedication.nomenclatureId && newMedication.quantity > 0) {
        await addMedication(newMedication);
        setNewMedication({
          nomenclatureId: '',
          quantity: 0,
          unitPrice: 0,
          invoiceNumber: '',
          receiptDate: format(new Date(), 'yyyy-MM-dd'),
          expiryDate: '',
          batchNumber: '',
          supplier: ''
        });
        setShowForm(false);
      }
    } catch (error) {
      alert(error.message || 'Произошла ошибка при добавлении препарата');
    }
  };

  const handleDeleteMedication = async () => {
    if (!medicationToDelete) return;
    
    try {
      setDeleteError(null);
      await deleteMedication(medicationToDelete);
      setShowDeleteConfirmation(false);
      setMedicationToDelete(null);
    } catch (error) {
      setDeleteError(error.message || 'Не удалось удалить препарат');
    }
  };

  const handleExport = () => {
    const headers = ['Код', 'Наименование', 'Категория', 'Количество', 'Ед. изм.', 'Цена', 'Партия', 'Годен до', 'Стоимость'];
    const rows = filteredMedications.map(med => {
      const nomenclature = nomenclatureItems.find(item => item.id === med.nomenclatureId);
      const totalValue = med.remainingQuantity * med.unitPrice;
      return [
        nomenclature?.code || '',
        nomenclature?.name || '',
        nomenclature ? categoryLabels[nomenclature.category] : '',
        med.remainingQuantity,
        nomenclature?.unit || '',
        med.unitPrice,
        med.batchNumber,
        med.expiryDate,
        totalValue
      ];
    });

    const content = [headers, ...rows].map(row => row.join('\t')).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `medications_${format(new Date(), 'yyyy-MM-dd')}.txt`);
  };
  
  // Генерация отчета
  const handleGenerateReport = () => {
    setShowReportModal(true);
  };
  
  // Печать отчета
  const handlePrintReport = () => {
    if (printFrameRef.current && printFrameRef.current.contentWindow) {
      printFrameRef.current.contentWindow.print();
    }
  };

  // Фильтрация препаратов
  const filteredMedications = medications.filter(med => {
    const nomenclature = nomenclatureItems.find(item => item.id === med.nomenclatureId);
    if (!nomenclature) return false;

    const matchesSearch = 
      nomenclature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nomenclature.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !selectedCategory || nomenclature.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });
  
  // Фильтрация препаратов для отчета
  const filteredReportMedications = medications.filter(med => {
    const nomenclature = nomenclatureItems.find(item => item.id === med.nomenclatureId);
    if (!nomenclature) return false;

    const matchesCategory = !reportFilters.category || nomenclature.category === reportFilters.category;
    
    let matchesExpiryDateFrom = true;
    if (reportFilters.expiryDateFrom) {
      matchesExpiryDateFrom = isAfter(
        parseISO(med.expiryDate), 
        parseISO(reportFilters.expiryDateFrom)
      ) || med.expiryDate === reportFilters.expiryDateFrom;
    }
    
    let matchesExpiryDateTo = true;
    if (reportFilters.expiryDateTo) {
      matchesExpiryDateTo = isBefore(
        parseISO(med.expiryDate), 
        parseISO(reportFilters.expiryDateTo)
      ) || med.expiryDate === reportFilters.expiryDateTo;
    }
    
    const matchesBatchNumber = !reportFilters.batchNumber || 
      med.batchNumber.toLowerCase().includes(reportFilters.batchNumber.toLowerCase());

    return matchesCategory && matchesExpiryDateFrom && matchesExpiryDateTo && matchesBatchNumber;
  });

  const totalValue = medications.reduce((sum, med) => 
    sum + (med.remainingQuantity * med.unitPrice), 0
  );
  
  // Пагинация
  const paginatedMedications = filteredMedications.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  const totalPages = Math.ceil(filteredMedications.length / pageSize);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages || 1));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = Number(e.target.value);
    setPageSize(newPageSize);
    const firstItemIndex = (currentPage - 1) * pageSize;
    setCurrentPage(Math.floor(firstItemIndex / newPageSize) + 1 || 1);
  };
  
  // Генерация HTML для печати отчета
  const generateReportHTML = () => {
    return `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Отчет по ветеринарным препаратам</title>
        <style>
          @page {
            size: landscape;
            margin: 1cm;
          }
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
          }
          .report-header {
            text-align: center;
            margin-bottom: 20px;
          }
          .report-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .report-date {
            font-size: 14px;
            margin-bottom: 20px;
          }
          .report-filters {
            margin-bottom: 20px;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 12px;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .expired {
            color: #e53e3e;
            font-weight: bold;
          }
          .expiring-soon {
            color: #dd6b20;
          }
          .total-row {
            font-weight: bold;
            background-color: #f9f9f9;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
          }
          .signature-line {
            border-top: 1px solid #000;
            width: 200px;
            margin-top: 30px;
            text-align: center;
          }
          @media print {
            button { 
              display: none;
            }
            .report-filters {
              border: 1px solid #ddd;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div class="report-title">ОТЧЕТ ПО ВЕТЕРИНАРНЫМ ПРЕПАРАТАМ</div>
          <div class="report-date">по состоянию на ${format(new Date(), 'dd.MM.yyyy')}</div>
        </div>
        
        <div class="report-filters">
          <strong>Примененные фильтры:</strong>
          <ul>
            <li>Категория: ${reportFilters.category ? categoryLabels[reportFilters.category as keyof typeof categoryLabels] : 'Все категории'}</li>
            ${reportFilters.expiryDateFrom ? `<li>Срок годности от: ${reportFilters.expiryDateFrom}</li>` : ''}
            ${reportFilters.expiryDateTo ? `<li>Срок годности до: ${reportFilters.expiryDateTo}</li>` : ''}
            ${reportFilters.batchNumber ? `<li>Номер партии: ${reportFilters.batchNumber}</li>` : ''}
          </ul>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Код</th>
              <th>Наименование</th>
              <th>Категория</th>
              <th>Партия</th>
              <th>Годен до</th>
              <th>Остаток</th>
              <th>Ед. изм.</th>
              <th>Цена за ед., ₽</th>
              <th>Стоимость, ₽</th>
            </tr>
          </thead>
          <tbody>
            ${filteredReportMedications.map((medication, index) => {
              const nomenclature = nomenclatureItems.find(item => item.id === medication.nomenclatureId);
              const totalValue = medication.remainingQuantity * medication.unitPrice;
              
              const isExpiringSoon = isAfter(new Date(medication.expiryDate), new Date()) && 
                                    isBefore(new Date(medication.expiryDate), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
              const isExpired = isBefore(new Date(medication.expiryDate), new Date());
              
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${nomenclature?.code || ''}</td>
                  <td>${nomenclature?.name || ''}</td>
                  <td>${nomenclature ? categoryLabels[nomenclature.category] : ''}</td>
                  <td>${medication.batchNumber}</td>
                  <td class="${isExpired ? 'expired' : isExpiringSoon ? 'expiring-soon' : ''}">${medication.expiryDate}</td>
                  <td>${medication.remainingQuantity} / ${medication.quantity}</td>
                  <td>${nomenclature?.unit || ''}</td>
                  <td>${medication.unitPrice.toLocaleString()}</td>
                  <td>${totalValue.toLocaleString()}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td colspan="9" style="text-align: right;">ИТОГО:</td>
              <td>${filteredReportMedications.reduce((sum, med) => sum + (med.remainingQuantity * med.unitPrice), 0).toLocaleString()} ₽</td>
            </tr>
          </tbody>
        </table>
        
        <div class="signatures">
          <div>
            <div>Руководитель: _______________________</div>
            <div class="signature-line">(подпись)</div>
          </div>
          <div>
            <div>Ответственный: _______________________</div>
            <div class="signature-line">(подпись)</div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()">Печать отчета</button>
        </div>
      </body>
      </html>
    `;
  };

  const isLoading = nomenclatureLoading || medicationsLoading;
  const error = nomenclatureError || medicationsError;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Ветеринарные препараты</h1>
        <div className="flex space-x-4">
          <input
            type="file"
            ref={fileInputRef}
            accept=".txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center"
          >
            <Upload size={20} className="mr-2" />
            Импорт
          </button>
          <button
            onClick={handleExport}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center"
          >
            <Download size={20} className="mr-2" />
            Экспорт
          </button>
          <button
            onClick={handleGenerateReport}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <FileText size={20} className="mr-2" />
            Сформировать отчет
          </button>
          <button
            onClick={() => setShowNomenclatureForm(true)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Добавить номенклатуру
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Оприходовать препарат
          </button>
          <button
            onClick={() => setShowWriteOffForm(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
          >
            <MinusCircle size={20} className="mr-2" />
            Списать препарат
          </button>
        </div>
      </div>

      {/* Отображение ошибок, если есть */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-9v4a1 1 0 11-2 0v-4a1 1 0 112 0zm0-4a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Индикатор загрузки */}
      {isLoading && (
        <div className="flex justify-center items-center py-6">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-gray-600">Загрузка данных...</p>
        </div>
      )}

      {/* Модальное окно формы создания номенклатуры */}
      {showNomenclatureForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Добавить номенклатуру</h2>
              <button
                onClick={() => setShowNomenclatureForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleNomenclatureSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Код</label>
                <input
                  type="text"
                  value={newNomenclature.code}
                  onChange={(e) => setNewNomenclature(prev => ({ ...prev, code: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Наименование</label>
                <input
                  type="text"
                  value={newNomenclature.name}
                  onChange={(e) => setNewNomenclature(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Единица измерения</label>
                <select
                  value={newNomenclature.unit}
                  onChange={(e) => setNewNomenclature(prev => ({ ...prev, unit: e.target.value as 'шт' | 'мл' | 'гр' }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="шт">шт</option>
                  <option value="мл">мл</option>
                  <option value="гр">гр</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Категория</label>
                <select
                  value={newNomenclature.category}
                  onChange={(e) => setNewNomenclature(prev => ({ 
                    ...prev, 
                    category: e.target.value as 'АНТИБИОТИК' | 'ВАКЦИНА' | 'ВИТАМИН' | 'ДРУГОЕ'
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNomenclatureForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно формы добавления препарата */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Оприходовать препарат</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleMedicationSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Препарат</label>
                <select
                  value={newMedication.nomenclatureId}
                  onChange={(e) => setNewMedication(prev => ({ ...prev, nomenclatureId: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Выберите препарат</option>
                  {nomenclatureItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Количество</label>
                  <input
                    type="number"
                    value={newMedication.quantity}
                    onChange={(e) => setNewMedication(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Цена за единицу</label>
                  <input
                    type="number"
                    value={newMedication.unitPrice}
                    onChange={(e) => setNewMedication(prev => ({ ...prev, unitPrice: Number(e.target.value) }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Номер накладной</label>
                  <input
                    type="text"
                    value={newMedication.invoiceNumber}
                    onChange={(e) => setNewMedication(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Номер партии</label>
                  <input
                    type="text"
                    value={newMedication.batchNumber}
                    onChange={(e) => setNewMedication(prev => ({ ...prev, batchNumber: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата поступления</label>
                  <input
                    type="date"
                    value={newMedication.receiptDate}
                    onChange={(e) => setNewMedication(prev => ({ ...prev, receiptDate: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Срок годности</label>
                  <input
                    type="date"
                    value={newMedication.expiryDate}
                    onChange={(e) => setNewMedication(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Поставщик</label>
                <input
                  type="text"
                  value={newMedication.supplier || ''}
                  onChange={(e) => setNewMedication(prev => ({ ...prev, supplier: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Укажите поставщика (необязательно)"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно формы списания */}
      {showWriteOffForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Списание препарата</h2>
              <button
                onClick={() => setShowWriteOffForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleWriteOffSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Препарат</label>
                <select
                  value={writeOffData.medicationId}
                  onChange={(e) => setWriteOffData(prev => ({ ...prev, medicationId: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Выберите препарат</option>
                  {medications
                    .filter(med => med.remainingQuantity > 0)
                    .map(med => {
                      const nomenclature = nomenclatureItems.find(item => item.id === med.nomenclatureId);
                      return (
                        <option key={med.id} value={med.id}>
                          {nomenclature?.name} (Остаток: {med.remainingQuantity} {nomenclature?.unit})
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Количество</label>
                <input
                  type="number"
                  min="1"
                  max={writeOffData.medicationId ? 
                    medications.find(m => m.id === writeOffData.medicationId)?.remainingQuantity 
                    : undefined
                  }
                  value={writeOffData.quantity}
                  onChange={(e) => setWriteOffData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Исполнитель</label>
                <select
                  value={writeOffData.executorId}
                  onChange={(e) => setWriteOffData(prev => ({ ...prev, executorId: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Выберите исполнителя</option>
                  {veterinarians.map(vet => (
                    <option key={vet.id} value={vet.id}>{vet.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Причина списания</label>
                <textarea
                  value={writeOffData.reason}
                  onChange={(e) => setWriteOffData(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowWriteOffForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Списать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-red-600">Удаление препарата</h2>
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setMedicationToDelete(null);
                  setDeleteError(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            {deleteError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <p>{deleteError}</p>
              </div>
            )}
            
            <div className="mb-4">
              <p className="text-gray-700">
                Вы уверены, что хотите удалить препарат из базы данных?
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Внимание:</strong> Это действие нельзя отменить. Препарат будет полностью удален из системы.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setMedicationToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteMedication}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно отчета */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Отчет по ветеринарным препаратам</h2>
              <div className="flex space-x-3">
                <button
                  onClick={handlePrintReport}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Printer size={20} className="mr-2" />
                  Печать
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="bg-gray-100 text-gray-700 p-2 rounded-full hover:bg-gray-200"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Фильтры для отчета */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium text-gray-700 mb-3">Фильтры</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Категория</label>
                  <select
                    name="category"
                    value={reportFilters.category}
                    onChange={handleReportFilterChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Все категории</option>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Срок годности от</label>
                  <input
                    type="date"
                    name="expiryDateFrom"
                    value={reportFilters.expiryDateFrom}
                    onChange={handleReportFilterChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Срок годности до</label>
                  <input
                    type="date"
                    name="expiryDateTo"
                    value={reportFilters.expiryDateTo}
                    onChange={handleReportFilterChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Номер партии</label>
                  <input
                    type="text"
                    name="batchNumber"
                    value={reportFilters.batchNumber}
                    onChange={handleReportFilterChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex-grow overflow-auto bg-gray-50 p-4">
              <iframe 
                ref={printFrameRef}
                srcDoc={generateReportHTML()}
                className="w-full h-full border-none"
                title="Отчет по ветеринарным препаратам"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Поиск по наименованию, коду..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Все категории</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <div className="text-sm text-gray-600">
              Общая стоимость: <span className="font-medium text-gray-900">{totalValue.toLocaleString()}₽</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Код</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Наименование</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Категория</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Партия</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Годен до</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Остаток</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена за ед.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Стоимость</th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="px-6 py-4 text-center text-gray-500">
                    Загрузка данных...
                  </td>
                </tr>
              ) : paginatedMedications.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="px-6 py-4 text-center text-gray-500">
                    Нет данных для отображения
                  </td>
                </tr>
              ) : (
                paginatedMedications.map((medication) => {
                  const nomenclature = nomenclatureItems.find(item => item.id === medication.nomenclatureId);
                  if (!nomenclature) return null;

                  const totalValue = medication.remainingQuantity * medication.unitPrice;
                  const isExpiringSoon = isAfter(new Date(medication.expiryDate), new Date()) && 
                                        isBefore(new Date(medication.expiryDate), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
                  const isExpired = isBefore(new Date(medication.expiryDate), new Date());
                  
                  return (
                    <tr key={medication.id} className={isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{nomenclature.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{nomenclature.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {categoryLabels[nomenclature.category]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{medication.batchNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={isExpired ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-yellow-600' : ''}>
                          {medication.expiryDate}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {medication.remainingQuantity} / {medication.quantity} {nomenclature.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{medication.unitPrice.toLocaleString()}₽</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{totalValue.toLocaleString()}₽</td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {medication.remainingQuantity === 0 && (
                            <button
                              onClick={() => {
                                setMedicationToDelete(medication.id);
                                setShowDeleteConfirmation(true);
                              }}
                              className="text-red-600 hover:text-red-800"
                              title="Удалить препарат с нулевым остатком"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Пагинация */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-sm text-gray-700 mr-2">
              Показывать по
            </span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              {filteredMedications.length > 0 
                ? `${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredMedications.length)} из ${filteredMedications.length}` 
                : '0 из 0'}
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1 || filteredMedications.length === 0}
                className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1 || filteredMedications.length === 0}
                className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages || filteredMedications.length === 0}
                className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages || filteredMedications.length === 0}
                className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Medications;