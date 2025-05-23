import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, Download, Upload, Trash2, Eye, X, Calendar, Clock, Printer, ChevronsRight } from 'lucide-react';
import { useBuyers, Buyer } from '../contexts/BuyersContext';
import { useShipments, Shipment, ShipmentAnimal } from '../contexts/ShipmentsContext';
import { useMovements } from '../contexts/MovementsContext';
import { useUser } from '../contexts/UserContext';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';
import ShipmentPrintForm from '../components/printForms/ShipmentPrintForm';

const Shipping: React.FC = () => {
  const { buyers, addBuyer, error: buyersError } = useBuyers();
  const { shipments, shipmentLogs, addShipment, deleteShipment, error: shipmentsError, loadShipmentAnimals } = useShipments();
  const { animals, updateAnimal } = useMovements();
  const { currentUser, users } = useUser();
  
  const [showBuyerForm, setShowBuyerForm] = useState(false);
  const [showShipmentForm, setShowShipmentForm] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showShipmentDetails, setShowShipmentDetails] = useState(false);
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);
  const [archiveAnimalNumber, setArchiveAnimalNumber] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedShipmentAnimals, setSelectedShipmentAnimals] = useState<ShipmentAnimal[]>([]);
  const [deleteReason, setDeleteReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printFormRef = useRef<HTMLDivElement>(null);
  
  const [error, setError] = useState<string | null>(null);
  
  // Состояние для выбора животных
  const [showAnimalSelector, setShowAnimalSelector] = useState(false);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);
  const [selectedAnimalsData, setSelectedAnimalsData] = useState<Array<{
    animalId: string;
    animalNumber: string;
    weight?: number;
    price?: number;
  }>>([]);
  const [animalSearchTerm, setAnimalSearchTerm] = useState('');
  
  const [newBuyer, setNewBuyer] = useState<Omit<Buyer, 'id' | 'isActive' | 'createdAt'>>({
    name: '',
    phone: '',
    vehicleNumber: '',
    address: '',
    contactPerson: ''
  });
  
  const [newShipment, setNewShipment] = useState<Omit<Shipment, 'id' | 'createdAt' | 'animalNumber' | 'buyerName' | 'releaserName' | 'animals'>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    buyerId: '',
    vehicleNumber: '',
    driverName: '',
    proxyNumber: '',
    releasedById: currentUser?.id || '',
    acceptedBy: '',
    totalAmount: 0,
    comments: ''
  });
  
  // Reset any errors when component unmounts or forms are closed
  useEffect(() => {
    setError(null);
  }, [showBuyerForm, showShipmentForm, showDeleteConfirmation, showShipmentDetails]);
  
  // Update vehicle number when buyer is selected
  useEffect(() => {
    if (newShipment.buyerId) {
      const selectedBuyer = buyers.find(buyer => buyer.id === newShipment.buyerId);
      if (selectedBuyer) {
        setNewShipment(prev => ({
          ...prev,
          vehicleNumber: selectedBuyer.vehicleNumber || ''
        }));
      }
    }
  }, [newShipment.buyerId, buyers]);
  
  // Загрузка животных для выбранной отгрузки
  useEffect(() => {
    if (selectedShipment && showShipmentDetails) {
      const fetchShipmentAnimals = async () => {
        const animals = await loadShipmentAnimals(selectedShipment.id);
        setSelectedShipmentAnimals(animals);
      };
      
      fetchShipmentAnimals();
    } else {
      setSelectedShipmentAnimals([]);
    }
  }, [selectedShipment, showShipmentDetails, loadShipmentAnimals]);
  
  // Combined error from all contexts
  const combinedError = error || buyersError || shipmentsError;
  
  // Функция для печати выбранной отгрузки
  const handlePrint = () => {
    if (!selectedShipment) return;
    
    // Создаем стиль для печати
    const style = document.createElement('style');
    style.innerHTML = `
      @page { 
        size: A4; 
        margin: 1cm; 
      }
      body * {
        visibility: hidden;
      }
      #shipment-print-form, #shipment-print-form * {
        visibility: visible;
      }
      #shipment-print-form {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
    `;
    document.head.appendChild(style);
    
    // Печатаем содержимое
    window.print();
    
    // Удаляем стиль
    document.head.removeChild(style);
  };

  // Фильтрация животных по поисковому запросу
  const filteredAnimals = animals.filter(animal => 
    animal.number.toLowerCase().includes(animalSearchTerm.toLowerCase()) &&
    animal.status !== 'Архив' // Исключаем животных со статусом "Архив"
  );
  
  // Добавление/удаление животного из выбранных
  const handleAnimalSelect = (animal: typeof animals[0]) => {
    setSelectedAnimalIds(prev => {
      if (prev.includes(animal.id)) {
        // Удаляем животное из массива выбранных ID
        return prev.filter(id => id !== animal.id);
      } else {
        // Добавляем животное в массив выбранных ID
        return [...prev, animal.id];
      }
    });
    
    setSelectedAnimalsData(prev => {
      // Проверяем, есть ли уже это животное в массиве
      const exists = prev.some(data => data.animalId === animal.id);
      
      if (exists) {
        // Удаляем животное из массива данных
        return prev.filter(data => data.animalId !== animal.id);
      } else {
        // Добавляем новое животное в массив данных
        return [...prev, {
          animalId: animal.id,
          animalNumber: animal.number,
          weight: parseFloat(animal.weight || '0') || undefined,
          price: undefined
        }];
      }
    });
  };
  
  // Обновление данных выбранного животного (вес, цена)
  const updateAnimalData = (animalId: string, field: 'weight' | 'price', value: number | undefined) => {
    setSelectedAnimalsData(prev => 
      prev.map(data => 
        data.animalId === animalId 
          ? { ...data, [field]: value } 
          : data
      )
    );
  };
  
  const handleBuyerInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewBuyer(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleShipmentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewShipment(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleBuyerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Валидация формы
    if (!newBuyer.name.trim()) {
      setError('Название покупателя обязательно для заполнения');
      return;
    }
    
    try {
      const result = await addBuyer(newBuyer);
      if (result) {
        setNewBuyer({
          name: '',
          phone: '',
          vehicleNumber: '',
          address: '',
          contactPerson: ''
        });
        setShowBuyerForm(false);
      }
    } catch (err) {
      setError('Не удалось добавить покупателя');
      console.error('Ошибка при добавлении покупателя:', err);
    }
  };
  
  const handleShipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Валидация формы
    if (selectedAnimalsData.length === 0) {
      setError('Необходимо выбрать хотя бы одно животное');
      return;
    }
    
    if (!newShipment.buyerId) {
      setError('Необходимо выбрать покупателя');
      return;
    }
    
    if (!newShipment.driverName) {
      setError('ФИО водителя обязательно для заполнения');
      return;
    }
    
    if (!newShipment.proxyNumber) {
      setError('Номер доверенности обязателен для заполнения');
      return;
    }
    
    if (!newShipment.acceptedBy) {
      setError('ФИО принявшего обязательно для заполнения');
      return;
    }
    
    try {
      // Проверка наличия животных в статусе "Архив"
      const archiveAnimals = selectedAnimalsData.filter(data => {
        const animal = animals.find(a => a.id === data.animalId);
        return animal && animal.status === 'Архив';
      });
      
      if (archiveAnimals.length > 0) {
        setArchiveAnimalNumber(archiveAnimals.map(a => a.animalNumber).join(', '));
        setShowArchiveWarning(true);
        return;
      }
      
      // Добавляем отгрузку
      const result = await addShipment(newShipment, selectedAnimalsData);
      
      if (result) {
        // Обновляем статус всех выбранных животных на "Архив"
        for (const animalData of selectedAnimalsData) {
          const animal = animals.find(a => a.id === animalData.animalId);
          if (animal) {
            await updateAnimal(animalData.animalId, {
              status: 'Архив'
            });
          }
        }
        
        // Сбрасываем форму
        setNewShipment({
          date: format(new Date(), 'yyyy-MM-dd'),
          buyerId: '',
          vehicleNumber: '',
          driverName: '',
          proxyNumber: '',
          releasedById: currentUser?.id || '',
          acceptedBy: '',
          totalAmount: 0,
          comments: ''
        });
        
        setSelectedAnimalIds([]);
        setSelectedAnimalsData([]);
        setShowShipmentForm(false);
      }
    } catch (err) {
      setError('Не удалось добавить отгрузку');
      console.error('Ошибка при добавлении отгрузки:', err);
    }
  };
  
  const handleDeleteConfirm = async () => {
    if (!selectedShipment || !deleteReason.trim()) {
      setError('Необходимо указать причину удаления');
      return;
    }
    
    try {
      await deleteShipment(selectedShipment.id, deleteReason.trim());
      
      // После успешного удаления отгрузки, восстанавливаем статус животных
      if (selectedShipment.animals) {
        for (const animal of selectedShipment.animals) {
          await updateAnimal(animal.animalId, {
            status: 'Без' // Или другой подходящий статус
          });
        }
      } else if (selectedShipment.animalId) {
        // Для обратной совместимости
        await updateAnimal(selectedShipment.animalId, {
          status: 'Без'
        });
      }
      
      setShowDeleteConfirmation(false);
      setSelectedShipment(null);
      setDeleteReason('');
    } catch (err) {
      setError('Не удалось удалить отгрузку');
      console.error('Ошибка при удалении отгрузки:', err);
    }
  };
  
  const handleExport = () => {
    const headers = [
      'Дата', 
      'Номера животных', 
      'Покупатель', 
      'Номер ТС', 
      'Водитель', 
      'Номер доверенности', 
      'Отпуск произвел', 
      'Принял', 
      'Общая сумма', 
      'Комментарии'
    ];
    
    const rows = shipments
      .filter(s => !s.deletedAt)
      .map(s => {
        const animalNumbers = s.animals 
          ? s.animals.map(a => a.animalNumber).join(', ')
          : s.animalNumber || '';
          
        return [
          s.date,
          animalNumbers,
          s.buyerName || s.buyerId,
          s.vehicleNumber,
          s.driverName,
          s.proxyNumber,
          s.releaserName || s.releasedById,
          s.acceptedBy,
          s.totalAmount || (s.price && s.weight ? s.price * s.weight : '') || '',
          s.comments || ''
        ];
      });

    const content = [headers, ...rows].map(row => row.join('\t')).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `shipments_${format(new Date(), 'yyyy-MM-dd')}.txt`);
  };
  
  // Фильтрация отгрузок по поисковому запросу
  const filteredShipments = shipments.filter(shipment => {
    const searchString = searchTerm.toLowerCase();
    // Проверяем совпадение в номерах животных, если есть массив animals
    const matchesAnimalNumbers = shipment.animals
      ? shipment.animals.some(animal => 
          animal.animalNumber.toLowerCase().includes(searchString)
        )
      : shipment.animalNumber?.toLowerCase().includes(searchString) || false;
      
    return (
      matchesAnimalNumbers ||
      shipment.buyerName?.toLowerCase().includes(searchString) ||
      shipment.vehicleNumber.toLowerCase().includes(searchString) ||
      shipment.driverName.toLowerCase().includes(searchString) ||
      shipment.proxyNumber.toLowerCase().includes(searchString) ||
      shipment.date.includes(searchString)
    );
  });
  
  // Получаем список животных, которые не в статусе "Архив"
  const availableAnimals = animals.filter(animal => animal.status !== 'Архив');

  // Расчет общей суммы выбранных животных для новой отгрузки
  const calculateTotalAmount = () => {
    return selectedAnimalsData.reduce((total, animal) => {
      return total + (animal.price || 0) * (animal.weight || 1);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Отгрузка животных</h1>
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
            onClick={() => setShowBuyerForm(true)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Добавить покупателя
          </button>
          <button
            onClick={() => setShowShipmentForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Оформить отгрузку
          </button>
        </div>
      </div>
      
      {combinedError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{combinedError}</p>
        </div>
      )}
      
      {/* Предупреждение о статусе "Архив" */}
      {showArchiveWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
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
      
      {/* Форма добавления нового покупателя */}
      {showBuyerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Добавить покупателя</h2>
              <button
                onClick={() => setShowBuyerForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleBuyerSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название организации / ФИО *
                </label>
                <input
                  type="text"
                  name="name"
                  value={newBuyer.name}
                  onChange={handleBuyerInputChange}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Номер телефона *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={newBuyer.phone}
                  onChange={handleBuyerInputChange}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="+7 (___) ___-__-__"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Номер ТС *
                </label>
                <input
                  type="text"
                  name="vehicleNumber"
                  value={newBuyer.vehicleNumber}
                  onChange={handleBuyerInputChange}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="А123БВ 36"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Адрес
                </label>
                <input
                  type="text"
                  name="address"
                  value={newBuyer.address}
                  onChange={handleBuyerInputChange}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="г. Воронеж, ул. Ленина, 1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Контактное лицо
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={newBuyer.contactPerson}
                  onChange={handleBuyerInputChange}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowBuyerForm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Добавить покупателя
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Форма добавления отгрузки */}
      {showShipmentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Оформить отгрузку</h2>
              <button
                onClick={() => {
                  setShowShipmentForm(false);
                  setSelectedAnimalIds([]);
                  setSelectedAnimalsData([]);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleShipmentSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Дата *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={newShipment.date}
                    onChange={handleShipmentInputChange}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Покупатель *
                  </label>
                  <select
                    name="buyerId"
                    value={newShipment.buyerId}
                    onChange={handleShipmentInputChange}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Выберите покупателя</option>
                    {buyers.filter(b => b.isActive).map(buyer => (
                      <option key={buyer.id} value={buyer.id}>{buyer.name}</option>
                    ))}
                  </select>
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setShowBuyerForm(true)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Добавить нового покупателя
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Номер ТС *
                  </label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    value={newShipment.vehicleNumber}
                    onChange={handleShipmentInputChange}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="А123БВ 36"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ФИО водителя *
                  </label>
                  <input
                    type="text"
                    name="driverName"
                    value={newShipment.driverName}
                    onChange={handleShipmentInputChange}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="Иванов Иван Иванович"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Номер доверенности *
                  </label>
                  <input
                    type="text"
                    name="proxyNumber"
                    value={newShipment.proxyNumber}
                    onChange={handleShipmentInputChange}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="123456"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Отпуск произвел *
                  </label>
                  <select
                    name="releasedById"
                    value={newShipment.releasedById}
                    onChange={handleShipmentInputChange}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Выберите сотрудника</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.fullName}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Принял ФИО *
                  </label>
                  <input
                    type="text"
                    name="acceptedBy"
                    value={newShipment.acceptedBy}
                    onChange={handleShipmentInputChange}
                    className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="Петров Петр Петрович"
                  />
                </div>
              </div>
              
              {/* Выбор животных */}
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Выберите животных для отгрузки</h3>
                  <button
                    type="button"
                    onClick={() => setShowAnimalSelector(true)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center text-sm"
                  >
                    <Plus size={16} className="mr-1" />
                    Выбрать животных
                  </button>
                </div>
                
                {selectedAnimalsData.length > 0 ? (
                  <div>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">№ животного</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Вес, кг</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Цена, руб</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Сумма, руб</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedAnimalsData.map((animal) => (
                          <tr key={animal.animalId}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{animal.animalNumber}</td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <input
                                type="number"
                                value={animal.weight || ''}
                                onChange={(e) => updateAnimalData(animal.animalId, 'weight', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                step="0.1"
                                placeholder="Вес"
                              />
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <input
                                type="number"
                                value={animal.price || ''}
                                onChange={(e) => updateAnimalData(animal.animalId, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                step="0.01"
                                placeholder="Цена"
                              />
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {animal.price && animal.weight 
                                ? (animal.price * animal.weight).toLocaleString() 
                                : '-'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleAnimalSelect(animals.find(a => a.id === animal.animalId)!)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50">
                          <td colSpan={3} className="px-4 py-2 text-right font-bold">ИТОГО:</td>
                          <td className="px-4 py-2 text-sm font-bold">
                            {calculateTotalAmount().toLocaleString()} руб.
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Нет выбранных животных</p>
                    <p className="text-sm mt-2">Нажмите "Выбрать животных" чтобы добавить животных в отгрузку</p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Комментарии
                </label>
                <textarea
                  name="comments"
                  value={newShipment.comments || ''}
                  onChange={handleShipmentInputChange}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Дополнительная информация..."
                />
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowShipmentForm(false);
                    setSelectedAnimalIds([]);
                    setSelectedAnimalsData([]);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={selectedAnimalsData.length === 0}
                  className={`px-4 py-2 rounded-md ${
                    selectedAnimalsData.length === 0 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Оформить отгрузку
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно выбора животных */}
      {showAnimalSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Выбор животных для отгрузки</h2>
              <button
                onClick={() => setShowAnimalSelector(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Поиск по номеру животного..."
                  value={animalSearchTerm}
                  onChange={(e) => setAnimalSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Выбор</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">№ животного</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Группа</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Вес, кг</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAnimals.map((animal) => (
                    <tr 
                      key={animal.id} 
                      className={`hover:bg-gray-50 cursor-pointer ${selectedAnimalIds.includes(animal.id) ? 'bg-blue-50' : ''}`}
                      onClick={() => handleAnimalSelect(animal)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedAnimalIds.includes(animal.id)}
                          onChange={() => {}} // Обработка происходит в onClick строки
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()} // Предотвращаем всплытие, чтобы не срабатывал onClick строки
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{animal.number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {animal.groupId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          animal.status === 'Архив' ? 'bg-gray-400 text-white' : 'bg-green-100 text-green-800'
                        }`}>
                          {animal.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {animal.weight || '-'}
                      </td>
                    </tr>
                  ))}
                  {filteredAnimals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        Животные не найдены или все уже находятся в архиве
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
              <div>
                <span className="text-sm text-gray-600">
                  Выбрано животных: <span className="font-semibold">{selectedAnimalIds.length}</span>
                </span>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowAnimalSelector(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Отмена
                </button>
                <button
                  onClick={() => setShowAnimalSelector(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <ChevronsRight size={16} className="mr-1" />
                  Применить выбор
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно подтверждения удаления отгрузки */}
      {showDeleteConfirmation && selectedShipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-red-600">Удаление отгрузки</h2>
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setSelectedShipment(null);
                  setDeleteReason('');
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <p className="mb-4">
              Вы действительно хотите удалить отгрузку
              {selectedShipment.animals && selectedShipment.animals.length > 0 
                ? ` ${selectedShipment.animals.length} животных`
                : selectedShipment.animalNumber 
                  ? ` животного №${selectedShipment.animalNumber}`
                  : ''
              }?
              <br />
              <span className="text-sm text-gray-500">
                Отгрузка будет помечена как удаленная, но информация о ней сохранится в системе. 
                Статус животных будет возвращен из "Архив" в обычный.
              </span>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Причина удаления *
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Укажите причину удаления..."
                required
              />
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setSelectedShipment(null);
                  setDeleteReason('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={!deleteReason.trim()}
                className={`px-4 py-2 rounded-md ${
                  deleteReason.trim() ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно просмотра деталей отгрузки */}
      {showShipmentDetails && selectedShipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                Детали отгрузки
                {selectedShipment.deletedAt && (
                  <span className="ml-2 text-sm text-white bg-red-500 rounded-full px-2 py-0.5">
                    Удалена
                  </span>
                )}
              </h2>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handlePrint}
                  className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition"
                  title="Печать"
                >
                  <Printer size={20} />
                </button>
                <button
                  onClick={() => {
                    setShowShipmentDetails(false);
                    setSelectedShipment(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Основная информация</h3>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Дата:</span> {selectedShipment.date}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Покупатель:</span> {selectedShipment.buyerName || selectedShipment.buyerId}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Номер доверенности:</span> {selectedShipment.proxyNumber}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Общая сумма:</span> {selectedShipment.totalAmount ? `${selectedShipment.totalAmount.toLocaleString()} руб.` : 'Не указана'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Информация о транспорте</h3>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Номер ТС:</span> {selectedShipment.vehicleNumber}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Водитель:</span> {selectedShipment.driverName}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Информация об отпуске</h3>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Отпуск произвел:</span> {selectedShipment.releaserName || selectedShipment.releasedById}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Принял:</span> {selectedShipment.acceptedBy}
                    </p>
                    {selectedShipment.comments && (
                      <p className="text-sm mt-2">
                        <span className="font-medium">Комментарии:</span> {selectedShipment.comments}
                      </p>
                    )}
                  </div>
                </div>
                
                {selectedShipment.deletedAt && (
                  <div>
                    <h3 className="text-sm font-medium text-red-500">Информация об удалении</h3>
                    <div className="mt-2 p-4 bg-red-50 rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">Дата удаления:</span> {selectedShipment.deletedAt.split('T')[0]}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Удалил:</span> {
                          users.find(u => u.id === selectedShipment.deletedBy)?.fullName || selectedShipment.deletedBy
                        }
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Причина:</span> {selectedShipment.deletedReason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Отгруженные животные */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Отгруженные животные</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">№ п/п</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">№ животного</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Вес, кг</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена, руб</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Стоимость, руб</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Если есть массив animals, используем его */}
                    {selectedShipmentAnimals.length > 0 ? (
                      selectedShipmentAnimals.map((animal, index) => (
                        <tr key={animal.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{animal.animalNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{animal.weight?.toLocaleString() || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{animal.price?.toLocaleString() || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {animal.weight && animal.price 
                              ? (animal.weight * animal.price).toLocaleString()
                              : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      // Для обратной совместимости используем legacy-поля
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{selectedShipment.animalNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{selectedShipment.weight?.toLocaleString() || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{selectedShipment.price?.toLocaleString() || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {selectedShipment.weight && selectedShipment.price 
                            ? (selectedShipment.weight * selectedShipment.price).toLocaleString()
                            : '-'}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan={4} className="px-6 py-4 text-right">ИТОГО:</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {selectedShipment.totalAmount
                          ? selectedShipment.totalAmount.toLocaleString()
                          : selectedShipment.price && selectedShipment.weight
                            ? (selectedShipment.price * selectedShipment.weight).toLocaleString()
                            : '-'} руб.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Журнал действий с отгрузкой */}
            {shipmentLogs.filter(log => log.shipmentId === selectedShipment.id).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Журнал действий</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Дата и время
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Пользователь
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Действие
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Детали
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {shipmentLogs
                        .filter(log => log.shipmentId === selectedShipment.id)
                        .map(log => (
                        <tr key={log.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(log.timestamp), 'dd.MM.yyyy HH:mm')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.userName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                              log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {log.action === 'CREATE' ? 'Создание' :
                               log.action === 'UPDATE' ? 'Изменение' :
                               'Удаление'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowShipmentDetails(false);
                  setSelectedShipment(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Закрыть
              </button>
            </div>

            {/* Печатная форма (скрыта на экране, видна только при печати) */}
            {selectedShipment && <ShipmentPrintForm shipment={{...selectedShipment, animals: selectedShipmentAnimals}} />}
          </div>
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Поиск по номеру животного, покупателю, номеру ТС..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  № животного(ых)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Покупатель
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Номер ТС
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Водитель
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  № доверенности
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сумма, руб
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredShipments.map(shipment => (
                <tr 
                  key={shipment.id}
                  className={shipment.deletedAt ? 'bg-red-50' : 'hover:bg-gray-50'}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {shipment.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {shipment.animals 
                      ? shipment.animals.map(a => a.animalNumber).join(', ')
                      : shipment.animalNumber || shipment.animalId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {shipment.buyerName || shipment.buyerId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {shipment.vehicleNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {shipment.driverName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {shipment.proxyNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {shipment.totalAmount 
                      ? shipment.totalAmount.toLocaleString()
                      : shipment.price && shipment.weight
                        ? (shipment.price * shipment.weight).toLocaleString()
                        : '-'
                    } руб.
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedShipment(shipment);
                          setShowShipmentDetails(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Просмотреть детали"
                      >
                        <Eye size={18} />
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedShipment(shipment);
                          handlePrint();
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Печать"
                      >
                        <Printer size={18} />
                      </button>
                      
                      {!shipment.deletedAt && (currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                        <button
                          onClick={() => {
                            setSelectedShipment(shipment);
                            setShowDeleteConfirmation(true);
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Удалить отгрузку"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredShipments.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    Отгрузки не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Дополняем CSS для печати */}
      <style>{`
        @media print {
          #shipment-print-form {
            display: block !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          @page {
            size: A4;
            margin: 1cm;
          }
          
          body * {
            visibility: hidden;
          }
          
          #shipment-print-form, #shipment-print-form * {
            visibility: visible;
          }
          
          #shipment-print-form {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default Shipping;