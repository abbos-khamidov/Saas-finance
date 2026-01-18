import asyncio
from datetime import datetime, timedelta
from aiogram import Bot, Dispatcher, Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, LabeledPrice, PreCheckoutQuery

BOT_TOKEN = "8061080569:AAGzvlcumKl6VKGq0gHa0GK0LnxsuX7c_U4"

PLANS = {
    "start": {
        "name": "⭐️ Старт",
        "stars": 50,
        "uzs": 12700,
        "period": 7,
        "features": ["✅ Трекинг воды", "✅ Учет калорий", "✅ 7 дней доступа"]
    },
    "pro": {
        "name": "🚀 Про",
        "stars": 150,
        "uzs": 38100,
        "period": 30,
        "features": ["✅ Все из Старт", "✅ Статистика и графики", "✅ Напоминания", "✅ 30 дней"]
    },
    "business": {
        "name": "💎 Бизнес",
        "stars": 400,
        "uzs": 101600,
        "period": 90,
        "features": ["✅ Все из Про", "✅ Экспорт данных", "✅ Приоритет поддержки", "✅ 90 дней"]
    }
}

user_db = {}

router = Router()
bot = Bot(token=BOT_TOKEN)

@router.message(Command('start'))
async def cmd_start(message: Message):
    user_id = message.from_user.id
    if user_id not in user_db:
        user_db[user_id] = {'premium': False, 'premium_until': None}

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text='Купить Premium', callback_data='buy_premium')]
    ])

    await message.answer('Hello! Welcome to our bot. Click the button below to buy premium.', reply_markup=keyboard)

@router.callback_query(F.data == 'buy_premium')
async def show_price(callback: CallbackQuery):
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text='Старт - 50 звезд', callback_data='plan_start')],
        [InlineKeyboardButton(text='Про - 150 звезд', callback_data='plan_pro')],
        [InlineKeyboardButton(text='Бизнес - 400 звезд', callback_data='plan_business')]
    ])

    await callback.message.edit_text(
        'Выберите тариф:\n\n⭐️ Старт - 50 звезд - 12000 UZS\n🚀 Про - 150 звезд - 38100 UZS\n💎 Бизнес - 400 звезд - 101600 UZS',
        reply_markup=keyboard
    )

@router.callback_query(F.data.startswith('plan_'))
async def show_plan(callback: CallbackQuery):
    plan_type = callback.data.split('_')[1]
    plan = PLANS[plan_type]

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f'Оплатить {plan["name"]}', callback_data=f'pay_{plan_type}')],
        [InlineKeyboardButton(text='Назад', callback_data='buy_premium')]
    ])

    features = '\n'.join(plan['features'])

    await callback.message.edit_text(
        f'{plan["name"]} - {plan["stars"]} звезд - {plan["uzs"]} UZS\n\n{features}',
        reply_markup=keyboard
    )

@router.callback_query(F.data.startswith('pay_'))
async def send_payment(callback: CallbackQuery):
    plan_type = callback.data.split('_')[1]
    plan = PLANS[plan_type]

    await bot.send_invoice(
        chat_id=callback.from_user.id,
        title='Healthbot - ' + plan['name'],
        description=f'Premium for {plan["period"]} days',
        payload=f'{plan_type}_{callback.from_user.id}',
        currency='XTR',
        prices=[LabeledPrice(label=plan['name'], amount=plan['stars'] * 100)]
    )

    await callback.answer()

@router.pre_checkout_query()
async def pre_checkout(query: PreCheckoutQuery):
    await query.answer(ok=True)

@router.message(F.successful_payment)
async def successful_payment(message: Message):
    payload = message.successful_payment.invoice_payload
    plan_type, user_id = payload.split('_')
    user_id = int(user_id)

    user_db[user_id]['premium'] = True
    user_db[user_id]['premium_until'] = datetime.now() + timedelta(days=PLANS[plan_type]['period'])

    await message.answer('Платеж успешно выполнен! Premium активирован.')

async def main():
    dp = Dispatcher()
    dp.include_router(router)
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())
