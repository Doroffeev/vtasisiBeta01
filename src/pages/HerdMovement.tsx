import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, ArrowRight, Eye, X, Download, Upload, Filter, Edit, Trash, AlertTriangle, FileText, Printer, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useGroups, Group } from '../contexts/GroupsContext';
import { useMovements } from '../contexts/MovementsContext';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';

const HerdMovement: React.FC = () => {
  const { groups, addGroup, error, updateGroup, deleteGroup } = useGroups();
  const { movements, addMovement, animals, updateAnimalGroup } = useMovements();
  const [showForm, setShowForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showGroupEditForm, setShowGroupEditForm] = useState(false);
  const [showGroupDeleteConfirm, setShowGroupDeleteConfirm] = useState(false);
  const [showMovementDetails, setShowMovementDetails] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [animalNumbers, setAnimalNumbers] = useState('');
  const [filteredAnimals, setFilteredAnimals] = useState<Array<typeof animals[0]>>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [showGroupsList, setShowGroupsList] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);
  const [archiveAnimalNumber, setArchiveAnimalNumber] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [movementsPageSize, setMovementsPageSize] = useState(10);
  const [movementsCurrentPage, setMovementsCurrentPage] = useState(1);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    fromGroup: '',
    toGroup: '',
    reason: ''
  });

  // Пагинация для списка движений
  const filteredMovements = useMemo(() => {
    return movements.filter(movement => {
      const animalNumbers = movement.animals.map(a => a.number).join(', ');
      return animalNumbers.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [movements, searchTerm]);

  const totalMovementsPages = Math.ceil(filteredMovements.length / movementsPageSize);

  const paginatedMovements = useMemo(() => {
    const startIndex = (movementsCurrentPage - 1) * movementsPageSize;
    return filteredMovements.slice(startIndex, startIndex + movementsPageSize);
  }, [filteredMovements, movementsCurrentPage, movementsPageSize]);

  const goToMovementsPage = (page: number) => {
    setMovementsCurrentPage(Math.min(Math.max(1, page), totalMovementsPages));
  };

  const goToFirstMovementsPage = () => goToMovementsPage(1);
  const goToLastMovementsPage = () => goToMovementsPage(totalMovementsPages);
  const goToPreviousMovementsPage = () => goToMovementsPage(movementsCurrentPage - 1);
  const goToNextMovementsPage = () => goToMovementsPage(movementsCurrentPage + 1);

  const handleMovementsPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = Number(e.target.value);
    setMovementsPageSize(newPageSize);
    const firstItemIndex = (movementsCurrentPage - 1) * movementsPageSize;
    setMovementsCurrentPage(Math.floor(firstItemIndex / newPageSize) + 1);
  };

  // Пагинация для списка животных
  const paginatedAnimals = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAnimals.slice(startIndex, startIndex + pageSize);
  }, [filteredAnimals, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAnimals.length / pageSize);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = Number(e.target.value);
    setPageSize(newPageSize);
    const firstItemIndex = (currentPage - 1) * pageSize;
    setCurrentPage(Math.floor(firstItemIndex / newPageSize) + 1);
  };

  // Обновляем фильтрованный список животных при изменении поисковой строки или выбранной группы
  useEffect(() => {
    const filtered = animals.filter(animal => 
      animal.number.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (!formData.fromGroup || animal.groupId === formData.fromGroup)
    );
    setFilteredAnimals(filtered);
  }, [searchTerm, animals, formData.fromGroup]);

  // Сбрасываем ошибки при изменении состояний формы
  useEffect(() => {
    setFormError(null);
  }, [showGroupForm, showForm, showGroupEditForm, showGroupDeleteConfirm]);

  // Устанавливаем ошибку группы, когда она изменяется в контексте групп
  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGroupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'number' && !/^\d*$/.test(value)) {
      return; // Only allow numeric input for group number
    }
    
    if (selectedGroup) {
      // Для режима редактирования
      setSelectedGroup(prev => ({
        ...prev!,
        [name]: value
      }));
    } else {
      // Для режима добавления новой группы
      setNewGroup(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверяем, есть ли среди выбранных животных архивные
    const archiveAnimals = animals.filter(
      animal => selectedAnimals.includes(animal.id) && animal.status === 'Архив'
    );
    
    if (archiveAnimals.length > 0) {
      setArchiveAnimalNumber(archiveAnimals[0].number);
      setShowArchiveWarning(true);
      return;
    }
    
    const selectedAnimalDetails = animals
      .filter(animal => selectedAnimals.includes(animal.id))
      .map(animal => ({
        id: animal.id,
        number: animal.number
      }));

    // Проверяем наличие выбранных животных
    if (selectedAnimalDetails.length === 0) {
      setFormError('Необходимо выбрать хотя бы одно животное');
      return;
    }

    // Проверяем, что выбраны разные группы "из" и "в"
    if (formData.fromGroup === formData.toGroup) {
      setFormError('Группы "Из" и "В" не могут быть одинаковыми');
      return;
    }

    const newMovement = {
      date: formData.date,
      animals: selectedAnimalDetails,
      fromGroup: formData.fromGroup,
      toGroup: formData.toGroup,
      reason: formData.reason
    };

    addMovement(newMovement);

    // Обновляем группу для каждого выбранного животного
    selectedAnimalDetails.forEach(animal => {
      updateAnimalGroup(animal.id, formData.toGroup);
    });

    setShowForm(false);
    setSelectedAnimals([]);
    setAnimalNumbers('');
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      fromGroup: '',
      toGroup: '',
      reason: ''
    });
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); // Сбрасываем ошибки перед отправкой
    
    try {
      await addGroup(newGroup);
      setNewGroup({
        number: ''
      });
      setShowGroupForm(false);
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Произошла ошибка при добавлении группы');
      }
    }
  };

  const handleGroupEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!selectedGroup) return;
    
    try {
      await updateGroup(selectedGroup.id, {
        number: selectedGroup.number
      });
      setShowGroupEditForm(false);
      setSelectedGroup(null);
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Произошла ошибка при обновлении группы');
      }
    }
  };

  const handleGroupDelete = async () => {
    if (!selectedGroup) return;
    
    try {
      await deleteGroup(selectedGroup.id);
      setShowGroupDeleteConfirm(false);
      setSelectedGroup(null);
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Произошла ошибка при удалении группы');
      }
    }
  };

  const toggleAnimalSelection = (animalId: string) => {
    setSelectedAnimals(prev =>
      prev.includes(animalId)
        ? prev.filter(id => id !== animalId)
        : [...prev, animalId]
    );
  };

  const handleAnimalNumbersChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setAnimalNumbers(value);

    // Parse numbers and update selection
    const numbers = value.split(/[,.\n]/).map(n => n.trim()).filter(Boolean);
    const selectedIds = animals
      .filter(animal => numbers.includes(animal.number))
      .map(animal => animal.id);
    
    setSelectedAnimals(selectedIds);
  };

  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group ? `${group.number}` : 'Не указана';
  };

  const handleExport = () => {
    const headers = ['Дата', 'Животные', 'Из группы', 'В группу', 'Причина'];
    const rows = movements.map(movement => [
      movement.date,
      movement.animals.map(a => a.number).join(','),
      getGroupName(movement.fromGroup),
      getGroupName(movement.toGroup),
      movement.reason
    ]);

    const content = [headers, ...rows].map(row => row.join('\t')).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `herd_movements_${format(new Date(), 'yyyy-MM-dd')}.txt`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split('\n');
      
      // Skip header row
      const dataRows = lines.slice(1);
      
      dataRows.forEach(row => {
        const [date, animalNumbers, fromGroupNumber, toGroupNumber, reason] = row.split('\t');
        
        // Find group IDs from numbers
        const fromGroup = groups.find(g => g.number === fromGroupNumber)?.id;
        const toGroup = groups.find(g => g.number === toGroupNumber)?.id;
        
        if (fromGroup && toGroup) {
          // Find animal IDs from numbers
          const animalIds = animalNumbers.split(',').map(number => {
            const animal = animals.find(a => a.number === number.trim());
            return animal ? { id: animal.id, number: animal.number } : null;
          }).filter((a): a is { id: string; number: string } => a !== null);

          if (animalIds.length > 0) {
            addMovement({
              date,
              animals: animalIds,
              fromGroup,
              toGroup,
              reason
            });
            
            // Обновляем группу для каждого импортированного животного
            animalIds.forEach(animal => {
              updateAnimalGroup(animal.id, toGroup);
            });
          }
        }
      });
    };
    
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Генерация отчета "Движение поголовья"
  const generateReport = () => {
    setShowReportModal(true);
  };

  // Печать отчета
  const handlePrintReport = () => {
    if (printFrameRef.current && printFrameRef.current.contentWindow) {
      printFrameRef.current.contentWindow.print();
    }
  };

  // Генерация HTML для печати отчета
  const generateReportHTML = () => {
    return `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Отчет по движению поголовья</title>
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
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div class="report-title">ОТЧЕТ ПО ДВИЖЕНИЮ ПОГОЛОВЬЯ</div>
          <div class="report-date">по состоянию на ${format(new Date(), 'dd.MM.yyyy')}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Дата</th>
              <th>Животные</th>
              <th>Из группы</th>
              <th>В группу</th>
              <th>Причина</th>
            </tr>
          </thead>
          <tbody>
            ${movements.map((movement, index) => {
              // Получаем номера животных из массива animals
              const animalNumbers = movement.animals.map(animal => {
                // Находим полную информацию о животном
                const animalInfo = animals.find(a => a.id === animal.id);
                // Возвращаем номер животного или его id, если номер не найден
                return animalInfo ? animalInfo.number : animal.number;
              }).join(', ');
              
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${movement.date}</td>
                  <td>${animalNumbers}</td>
                  <td>${getGroupName(movement.fromGroup)}</td>
                  <td>${getGroupName(movement.toGroup)}</td>
                  <td>${movement.reason || ''}</td>
                </tr>
              `;
            }).join('')}
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Движение поголовья</h1>
        <div className="flex space-x-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
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
            onClick={generateReport}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <FileText size={20} className="mr-2" />
            Сформировать отчет
          </button>
          <button
            onClick={() => setShowGroupsList(!showGroupsList)}
            className={`${
              showGroupsList ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
            } px-4 py-2 rounded-md hover:bg-gray-200 flex items-center`}
          >
            <Filter size={20} className="mr-2" />
            Список групп
          </button>
          <button
            onClick={() => setShowGroupForm(true)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Добавить группу
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <ArrowRight size={20} className="mr-2" />
            Переместить животных
          </button>
        </div>
      </div>

      {/* Модальное окно отчета */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Отчет по движению поголовья</h2>
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
            
            <div className="flex-grow overflow-auto bg-gray-50 p-4">
              <iframe 
                ref={printFrameRef}
                srcDoc={generateReportHTML()}
                className="w-full h-full border-none"
                title="Отчет по движению поголовья"
              />
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно предупреждения о статусе "Архив" */}
      {showArchiveWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-600">Предупреждение</h3>
                <p className="mt-2 text-gray-600">
                  Животное №{archiveAnimalNumber} имеет статус "Архив". 
                  Действия запрещены, измените статус!
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowArchiveWarning(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      {showGroupsList && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Список групп</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Номер</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groups.map(group => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{group.number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => {
                          setSelectedGroup(group);
                          setShowGroupEditForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Редактировать"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedGroup(group);
                          setShowGroupDeleteConfirm(true);
                        }}
                        className="text-red-600 hover:text-red-800 p-1 ml-2"
                        title="Удалить"
                      >
                        <Trash size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showGroupForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Добавить новую группу</h2>
            {formError && (
              <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-md">
                {formError}
              </div>
            )}
            <form onSubmit={handleGroupSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Номер группы</label>
                <input
                  type="text"
                  name="number"
                  value={newGroup.number}
                  onChange={handleGroupInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Введите номер группы"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowGroupForm(false)}
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

      {showGroupEditForm && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Редактировать группу</h2>
            {formError && (
              <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-md">
                {formError}
              </div>
            )}
            <form onSubmit={handleGroupEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Номер группы</label>
                <input
                  type="text"
                  name="number"
                  value={selectedGroup.number}
                  onChange={handleGroupInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Введите номер группы"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupEditForm(false);
                    setSelectedGroup(null);
                  }}
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

      {showGroupDeleteConfirm && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Подтверждение удаления</h2>
            {formError && (
              <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-m">
                {formError}
              </div>
            )}
            <p className="mb-6">
              Вы уверены, что хотите удалить группу <strong>"{selectedGroup.number}"</strong>? 
              Это действие нельзя будет отменить.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowGroupDeleteConfirm(false);
                  setSelectedGroup(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleGroupDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
            <h2 className="text-xl font-semibold mb-4">Переместить животных</h2>
            {formError && (
              <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-md">
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Из группы</label>
                  <select
                    name="fromGroup"
                    value={formData.fromGroup}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Выберите группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.number}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">В группу</label>
                  <select
                    name="toGroup"
                    value={formData.toGroup}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Выберите группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Введите номера животных (через запятую, точку или новую строку)
                </label>
                <textarea
                  value={animalNumbers}
                  onChange={handleAnimalNumbersChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Например: 0122,0123,0124 или 0122.0123.0124"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Выбранные животные</label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Выбор
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Номер
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Группа
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Статус
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedAnimals
                        .filter(animal => animal.status !== 'Архив')
                        .map(animal => (
                          <tr key={animal.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedAnimals.includes(animal.id)}
                                onChange={() => toggleAnimalSelection(animal.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {animal.number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {getGroupName(animal.groupId)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                animal.isUnderTreatment ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {animal.isUnderTreatment ? 'На лечении' : animal.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>

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
                        {`${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredAnimals.length)} из ${filteredAnimals.length}`}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={goToFirstPage}
                          disabled={currentPage === 1}
                          className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronsLeft size={16} />
                        </button>
                        <button
                          onClick={goToPreviousPage}
                          disabled={currentPage === 1}
                          className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={goToNextPage}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight size={16} />
                        </button>
                        <button
                          onClick={goToLastPage}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronsRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Причина перемещения</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedAnimals([]);
                    setAnimalNumbers('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={selectedAnimals.length === 0 || !formData.fromGroup || !formData.toGroup}
                >
                  Переместить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMovementDetails && selectedMovement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-semibold">Детали перемещения</h2>
              <button
                onClick={() => {
                  setShowMovementDetails(false);
                  setSelectedMovement(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            {movements.find(m => m.id === selectedMovement) && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Дата</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {movements.find(m => m.id === selectedMovement)?.date}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Причина</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {movements.find(m => m.id === selectedMovement)?.reason}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Из группы</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {getGroupName(movements.find(m => m.id === selectedMovement)?.fromGroup || '')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">В группу</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {getGroupName(movements.find(m => m.id === selectedMovement)?.toGroup || '')}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Перемещенные животные</label>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-4 gap-2">
                      {movements.find(m => m.id === selectedMovement)?.animals.map(animal => (
                        <div
                          key={animal.id}
                          className="bg-white rounded-md p-2 text-sm text-gray-900 text-center"
                        >
                          {animal.number}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Поиск по номеру животного..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Животные</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Из группы</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">В группу</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Причина</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedMovements.map(movement => (
                <tr key={movement.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{movement.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.animals.map(a => a.number).join(', ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getGroupName(movement.fromGroup)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getGroupName(movement.toGroup)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{movement.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => {
                        setSelectedMovement(movement.id);
                        setShowMovementDetails(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Пагинация для списка движений */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-2">
                Показывать по
              </span>
              <select
                value={movementsPageSize}
                onChange={handleMovementsPageSizeChange}
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
                {`${(movementsCurrentPage - 1) * movementsPageSize + 1} - ${Math.min(movementsCurrentPage * movementsPageSize, filteredMovements.length)} из ${filteredMovements.length}`}
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={goToFirstMovementsPage}
                  disabled={movementsCurrentPage === 1}
                  className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  onClick={goToPreviousMovementsPage}
                  disabled={movementsCurrentPage === 1}
                  className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={goToNextMovementsPage}
                  disabled={movementsCurrentPage === totalMovementsPages}
                  className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={goToLastMovementsPage}
                  disabled={movementsCurrentPage === totalMovementsPages}
                  className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HerdMovement;