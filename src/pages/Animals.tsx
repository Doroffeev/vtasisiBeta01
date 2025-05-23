import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash, X, Download, Check, ExternalLink, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useMovements } from '../contexts/MovementsContext';
import { useGroups } from '../contexts/GroupsContext';
import { useVetOperations } from '../contexts/VetOperationsContext';
import { useInsemination } from '../contexts/InseminationContext';
import { usePlannedOperations } from '../contexts/PlannedOperationsContext';
import ReproductionCycle from '../components/ReproductionCycle';

const Animals: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { animals, addAnimal, updateAnimal } = useMovements();
  const { groups } = useGroups();
  const { activeTreatments } = useVetOperations();
  const { getLatestInsemination } = useInsemination();
  const { getAnimalScheduledOperations } = usePlannedOperations();

  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [formData, setFormData] = useState({
    number: '',
    groupId: '',
    status: 'Без',
    birthDate: '',
    gender: 'female',
    motherId: '',
    weight: '',
    responder: ''
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [showAnimalCycleTab, setShowAnimalCycleTab] = useState(false);

  // Получаем selectedAnimalId из URL-параметров при загрузке компонента
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const animalId = params.get('id');
    if (animalId) {
      setSelectedAnimalId(animalId);
      setShowDetails(true);
    }
  }, [location]);

  // Фильтрация животных
  const filteredAnimals = useMemo(() => {
    return animals.filter(animal => 
      (animal.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
      animal.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedGroupFilter ? animal.groupId === selectedGroupFilter : true) &&
      (selectedStatusFilter ? animal.status === selectedStatusFilter : true)
    );
  }, [animals, searchTerm, selectedGroupFilter, selectedStatusFilter]);
  
  // Пагинация - получаем только животных для текущей страницы
  const paginatedAnimals = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAnimals.slice(startIndex, startIndex + pageSize);
  }, [filteredAnimals, currentPage, pageSize]);
  
  // Общее количество страниц
  const totalPages = Math.ceil(filteredAnimals.length / pageSize);
  
  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedGroupFilter, selectedStatusFilter]);
  
  // Получение уникальных статусов для фильтрации
  const uniqueStatuses = Array.from(new Set(animals.map(animal => animal.status)));

  // Получение группы по ID
  const getGroupName = (id: string | undefined) => {
    if (!id) return 'Не указано';
    const group = groups.find(g => g.id === id);
    return group ? group.number : 'Не найдено';
  };

  // Получение информации о матери по ID
  const getMotherInfo = (id: string | undefined) => {
    if (!id) return 'Не указано';
    const mother = animals.find(a => a.id === id);
    return mother ? mother.number : 'Не найдено';
  };

  // Получение активного лечения для животного
  const getActiveTreatment = (animalId: string) => {
    return activeTreatments.find(t => t.animalId === animalId && !t.isCompleted);
  };

  // Обработчик изменения полей формы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Обработчик отправки формы добавления
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверка обязательных полей
    if (!formData.number || !formData.gender) {
      return;
    }

    try {
      const newAnimal = await addAnimal({
        name: formData.number,
        number: formData.number,
        groupId: formData.groupId || groups[0]?.id || '',
        status: formData.status,
        birthDate: formData.birthDate,
        gender: formData.gender as 'male' | 'female',
        motherId: formData.motherId || undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        responder: formData.responder,
        isUnderTreatment: false,
        hasMastitis: false,
        lactation: 0,
        nextCalvingDate: '',
        inseminationCount: 0
      });
      
      setShowAddForm(false);
      setFormData({
        number: '',
        groupId: '',
        status: 'Без',
        birthDate: '',
        gender: 'female',
        motherId: '',
        weight: '',
        responder: ''
      });
    } catch (error) {
      console.error('Ошибка при добавлении животного:', error);
    }
  };

  // Обработчик отправки формы редактирования
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAnimalId) return;

    try {
      await updateAnimal(selectedAnimalId, {
        name: formData.number,
        number: formData.number,
        groupId: formData.groupId,
        status: formData.status,
        birthDate: formData.birthDate,
        gender: formData.gender as 'male' | 'female',
        motherId: formData.motherId || undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        responder: formData.responder
      });
      
      setShowEditForm(false);
    } catch (error) {
      console.error('Ошибка при обновлении животного:', error);
    }
  };

  // Обработчик удаления животного
  const handleDelete = async () => {
    if (!selectedAnimalId) return;

    try {
      await updateAnimal(selectedAnimalId, { status: 'Архив' });
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error) {
      console.error('Ошибка при удалении животного:', error);
    }
  };

  // Обработчик выбора животного для просмотра деталей
  const handleSelectAnimal = (animalId: string) => {
    setSelectedAnimalId(animalId);
    setShowDetails(true);
    navigate(`/animals?id=${animalId}`);
    
    // Заполняем форму редактирования данными выбранного животного
    const animal = animals.find(a => a.id === animalId);
    if (animal) {
      setFormData({
        number: animal.number,
        groupId: animal.groupId,
        status: animal.status,
        birthDate: animal.birthDate || '',
        gender: animal.gender,
        motherId: animal.motherId || '',
        weight: animal.weight ? String(animal.weight) : '',
        responder: animal.responder || ''
      });
    }
  };
  
  // Функции пагинации
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };
  
  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };
  
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };
  
  const goToFirstPage = () => {
    setCurrentPage(1);
  };
  
  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };
  
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value);
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Получаем выбранное животное
  const selectedAnimal = selectedAnimalId ? animals.find(a => a.id === selectedAnimalId) : null;
  
  // Получаем последнее осеменение для выбранного животного
  const latestInsemination = selectedAnimalId ? getLatestInsemination(selectedAnimalId) : undefined;
  
  // Получаем запланированные операции для выбранного животного
  const scheduledOperations = selectedAnimalId ? getAnimalScheduledOperations(selectedAnimalId) : [];

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопки */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Животные</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Добавить животное
        </button>
      </div>

      {/* Фильтры */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Поиск по номеру..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
            <div className="flex items-center">
              <Filter className="text-gray-500 mr-2" size={18} />
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Все группы</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.number}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <Filter className="text-gray-500 mr-2" size={18} />
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Все статусы</option>
                {uniqueStatuses.map((status, index) => (
                  <option key={index} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Таблица животных */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Номер</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Группа</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата рождения</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedAnimals.map(animal => (
                <tr 
                  key={animal.id}
                  className={`${animal.isUnderTreatment ? 'bg-yellow-50' : ''} ${animal.status === 'Архив' ? 'bg-gray-100 text-gray-500' : ''} hover:bg-gray-50 cursor-pointer`}
                  onClick={() => handleSelectAnimal(animal.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{animal.number}</div>
                      {animal.isUnderTreatment && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          На лечении
                        </span>
                      )}
                      {animal.hasMastitis && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Мастит
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getGroupName(animal.groupId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      animal.status === 'Осем' ? 'bg-blue-100 text-blue-800' :
                      animal.status === 'Стел' ? 'bg-green-100 text-green-800' :
                      animal.status === 'Ялов' ? 'bg-red-100 text-red-800' :
                      animal.status === 'Архив' ? 'bg-gray-100 text-gray-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {animal.status}
                    </span>
                    
                    {/* Индикатор запланированных операций */}
                    {getAnimalScheduledOperations(animal.id).filter(op => !op.isCompleted).length > 0 && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        План
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {animal.birthDate || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      className="text-blue-600 hover:text-blue-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAnimal(animal.id);
                      }}
                    >
                      Детали
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Пагинация */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-sm text-gray-700 mr-2">
              Показать по
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
              {filteredAnimals.length > 0 ? 
                `${Math.min((currentPage - 1) * pageSize + 1, filteredAnimals.length)} - ${Math.min(currentPage * pageSize, filteredAnimals.length)} из ${filteredAnimals.length}` : 
                '0 записей'
              }
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1 || filteredAnimals.length === 0}
                className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 1 || filteredAnimals.length === 0}
                className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages || filteredAnimals.length === 0}
                className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages || filteredAnimals.length === 0}
                className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно добавления животного */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Добавить животное</h2>
              <button 
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Номер</label>
                <input
                  type="text"
                  name="number"
                  value={formData.number}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Группа</label>
                  <select
                    name="groupId"
                    value={formData.groupId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Выберите группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>{group.number}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Статус</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="Без">Без</option>
                    <option value="Осем">Осем</option>
                    <option value="Стел">Стел</option>
                    <option value="Ялов">Ялов</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата рождения</label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Пол</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="female">Женский</option>
                    <option value="male">Мужской</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Мать</label>
                  <select
                    name="motherId"
                    value={formData.motherId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Не указано</option>
                    {animals
                      .filter(a => a.gender === 'female' && a.id !== selectedAnimalId)
                      .map(animal => (
                        <option key={animal.id} value={animal.id}>{animal.number}</option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Вес (кг)</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Респондер</label>
                <input
                  type="text"
                  name="responder"
                  value={formData.responder}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
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

      {/* Модальное окно редактирования животного */}
      {showEditForm && selectedAnimalId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Редактировать животное</h2>
              <button 
                onClick={() => setShowEditForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Номер</label>
                <input
                  type="text"
                  name="number"
                  value={formData.number}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Группа</label>
                  <select
                    name="groupId"
                    value={formData.groupId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Выберите группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>{group.number}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Статус</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="Без">Без</option>
                    <option value="Осем">Осем</option>
                    <option value="Стел">Стел</option>
                    <option value="Ялов">Ялов</option>
                    <option value="Архив">Архив</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата рождения</label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Пол</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="female">Женский</option>
                    <option value="male">Мужской</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Мать</label>
                  <select
                    name="motherId"
                    value={formData.motherId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Не указано</option>
                    {animals
                      .filter(a => a.gender === 'female' && a.id !== selectedAnimalId)
                      .map(animal => (
                        <option key={animal.id} value={animal.id}>{animal.number}</option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Вес (кг)</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Респондер</label>
                <input
                  type="text"
                  name="responder"
                  value={formData.responder}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
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

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && selectedAnimalId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-red-800">Подтверждение удаления</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Вы уверены, что хотите удалить это животное? Животное будет перемещено в архив.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно деталей животного */}
      {showDetails && selectedAnimal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Информация о животном #{selectedAnimal.number}</h2>
              <button 
                onClick={() => {
                  setShowDetails(false);
                  setShowAnimalCycleTab(false);
                  navigate('/animals');
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex border-b border-gray-200 mb-4">
              <button
                onClick={() => setShowAnimalCycleTab(false)}
                className={`py-2 px-4 border-b-2 ${!showAnimalCycleTab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Основная информация
              </button>
              <button
                onClick={() => setShowAnimalCycleTab(true)}
                className={`py-2 px-4 border-b-2 ${showAnimalCycleTab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Репродуктивный цикл
              </button>
            </div>
            
            {!showAnimalCycleTab ? (
              <div className="space-y-6">
                {/* Основная информация и действия */}
                <div className="flex justify-between mb-4">
                  <div className="space-y-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedAnimal.status === 'Осем' ? 'bg-blue-100 text-blue-800' :
                      selectedAnimal.status === 'Стел' ? 'bg-green-100 text-green-800' :
                      selectedAnimal.status === 'Ялов' ? 'bg-red-100 text-red-800' :
                      selectedAnimal.status === 'Архив' ? 'bg-gray-100 text-gray-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedAnimal.status}
                    </span>
                    
                    {selectedAnimal.isUnderTreatment && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        На лечении
                      </span>
                    )}
                    
                    {selectedAnimal.hasMastitis && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Мастит
                      </span>
                    )}
                    
                    {selectedAnimal.gender === 'male' && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Бычок
                      </span>
                    )}
                    
                    {selectedAnimal.gender === 'female' && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                        Телка
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowEditForm(true)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
                      title="Редактировать"
                    >
                      <Edit size={16} className="mr-1" />
                      Редактировать
                    </button>
                    
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center"
                      title="Удалить"
                    >
                      <Trash size={16} className="mr-1" />
                      Удалить
                    </button>
                  </div>
                </div>
                
                {/* Информация о животном */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Основная информация</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Номер:</span>
                        <span className="text-sm font-medium">{selectedAnimal.number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Группа:</span>
                        <span className="text-sm font-medium">{getGroupName(selectedAnimal.groupId)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Статус:</span>
                        <span className="text-sm font-medium">{selectedAnimal.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Дата рождения:</span>
                        <span className="text-sm font-medium">{selectedAnimal.birthDate || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Пол:</span>
                        <span className="text-sm font-medium">{selectedAnimal.gender === 'female' ? 'Женский' : 'Мужской'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Мать:</span>
                        <span className="text-sm font-medium">{getMotherInfo(selectedAnimal.motherId)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Дополнительная информация</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Вес:</span>
                        <span className="text-sm font-medium">
                          {selectedAnimal.weight ? `${selectedAnimal.weight} кг` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Респондер:</span>
                        <span className="text-sm font-medium">{selectedAnimal.responder || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Дата последнего отела:</span>
                        <span className="text-sm font-medium">{selectedAnimal.lastCalvingDate || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Дата последнего осеменения:</span>
                        <span className="text-sm font-medium">{selectedAnimal.lastInseminationDate || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Кол-во осеменений:</span>
                        <span className="text-sm font-medium">{selectedAnimal.inseminationCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Лактация:</span>
                        <span className="text-sm font-medium">{selectedAnimal.lactation || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Лечение */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Лечение</h3>
                  {getActiveTreatment(selectedAnimal.id) ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-yellow-800">На лечении</p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Начало: {new Date(getActiveTreatment(selectedAnimal.id)!.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <a
                          href="/vet-operations"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          Подробнее <ExternalLink size={14} className="ml-1" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Лечение не назначено</div>
                  )}
                </div>
                
                {/* Осеменение */}
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Осеменение</h3>
                  {latestInsemination ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-blue-800">
                            Последнее осеменение: {new Date(latestInsemination.date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            Статус: {latestInsemination.status}
                          </p>
                        </div>
                        <a
                          href="/insemination"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          Подробнее <ExternalLink size={14} className="ml-1" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Нет данных об осеменении</div>
                  )}
                </div>
              </div>
            ) : (
              <ReproductionCycle animalId={selectedAnimalId} />
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowDetails(false);
                  setShowAnimalCycleTab(false);
                  navigate('/animals');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Animals;