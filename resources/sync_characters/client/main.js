'use strict';

/**
 * Stage 2 temporary chat UX (RU). Full NUI arrives in Stage 3.
 */

function notify(msg) {
  emit('chat:addMessage', {
    color: [59, 130, 246],
    multiline: true,
    args: ['SyncRP', msg],
  });
}

onNet('sync:characters:listResult', (res) => {
  if (!res || !res.ok) {
    notify(`Список персонажей: ${res && res.error ? res.error : 'ошибка'}`);
    return;
  }
  if (!res.characters.length) {
    notify(`Нет персонажей. Создайте: /charcreate Имя Фамилия male|female 1995-01-01`);
    return;
  }
  const lines = res.characters.map(
    (c) => `#${c.id} слот ${c.slot}: ${c.firstName} ${c.lastName} (${c.gender})`,
  );
  notify(`Персонажи (макс. ${res.maxSlots}):\n${lines.join('\n')}\nВыбор: /charselect ID`);
});

onNet('sync:characters:createResult', (res) => {
  if (!res || !res.ok) {
    notify(`Создание: ${res && res.error ? res.error : 'ошибка'}`);
    return;
  }
  notify(
    `Создан #${res.character.id} ${res.character.firstName} ${res.character.lastName}. /charselect ${res.character.id}`,
  );
});

onNet('sync:characters:selectResult', (res) => {
  if (!res || !res.ok) {
    notify(`Выбор: ${res && res.error ? res.error : 'ошибка'}`);
    return;
  }
  notify(`Вы вошли как ${res.character.firstName} ${res.character.lastName}`);
});

onNet('sync:characters:deleteResult', (res) => {
  if (!res || !res.ok) {
    notify(`Удаление: ${res && res.error ? res.error : 'ошибка'}`);
    return;
  }
  notify('Персонаж удалён (soft delete)');
});

onNet('sync:characters:selected', (ch) => {
  if (ch && ch.firstName) {
    notify(`Спавн: ${ch.firstName} ${ch.lastName}`);
  }
});

RegisterCommand(
  'chars',
  () => {
    emitNet('sync:characters:list');
  },
  false,
);

RegisterCommand(
  'charcreate',
  (_src, args) => {
    const firstName = args[0];
    const lastName = args[1];
    const gender = args[2] || 'male';
    const dateOfBirth = args[3] || '1995-01-01';
    if (!firstName || !lastName) {
      notify('Использование: /charcreate Имя Фамилия [male|female|other] [YYYY-MM-DD]');
      return;
    }
    emitNet('sync:characters:create', { firstName, lastName, gender, dateOfBirth });
  },
  false,
);

RegisterCommand(
  'charselect',
  (_src, args) => {
    const id = Number(args[0]);
    if (!id) {
      notify('Использование: /charselect ID');
      return;
    }
    emitNet('sync:characters:select', id);
  },
  false,
);

RegisterCommand(
  'chardelete',
  (_src, args) => {
    const id = Number(args[0]);
    if (!id) {
      notify('Использование: /chardelete ID');
      return;
    }
    emitNet('sync:characters:delete', id);
  },
  false,
);

setTimeout(() => {
  notify('Stage 2: /chars | /charcreate | /charselect | /chardelete');
}, 3000);
