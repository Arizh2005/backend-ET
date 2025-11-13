const Income = require("../models/Income");
const Expense = require("../models/Expense");
const { isValidObjectId, Types } = require('mongoose');

const normalizeAmountField = (document) => {
    if (!document) return document;
    const obj = document.toObject ? document.toObject() : { ...document };
    const value = obj.amount ?? obj.ammount ?? 0;
    return {
        ...obj,
        amount: Number(value) || 0,
    };
};

exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;
        const userObjectId = new Types.ObjectId(String(userId));

        const totalIncome = await Income.aggregate([
            { $match: { userId: userObjectId } }, 
            {
                $group: {
                    _id: null,
                    total: {
                        $sum: {
                            $ifNull: ["$amount", "$ammount"]
                        }
                    }
                }
            },
        ]);

        console.log("totalIncome", { totalIncome, userId: isValidObjectId(userId) });

        const totalExpense = await Expense.aggregate([
            { $match: { userId: userObjectId } },
            {
                $group: {
                    _id: null,
                    total: {
                        $sum: {
                            $ifNull: ["$amount", "$ammount"]
                        }
                    }
                }
            },
        ]);

        // Fix: Use userObjectId instead of userId
        const last60DaysIncomeTransactionsRaw = await Income.find({
            userId: userObjectId,
            date: { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
        }).sort({ date: -1 });
        const last60DaysIncomeTransactions = last60DaysIncomeTransactionsRaw.map(normalizeAmountField);

        const incomeLast60Days = last60DaysIncomeTransactions.reduce(
            (sum, transaction) => sum + (Number(transaction.amount) || 0),
            0
        );

        // Fix: Use userObjectId instead of userId
        const last30DaysExpenseTransactionRaw = await Expense.find({
            userId: userObjectId,
            date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }).sort({ date: -1 });
        const last30DaysExpenseTransaction = last30DaysExpenseTransactionRaw.map(normalizeAmountField);

        const expenseLast30Days = last30DaysExpenseTransaction.reduce(
            (sum, transaction) => sum + (Number(transaction.amount) || 0),
            0
        );

        // Fix: Use userObjectId for consistency
        const recentIncomeTransactions = await Income.find({ userId: userObjectId }).sort({ date: -1 }).limit(5);
        const recentExpenseTransactions = await Expense.find({ userId: userObjectId }).sort({ date: -1 }).limit(5);

        const lastTransactions = [
            ...recentIncomeTransactions.map((txn) => ({
                ...normalizeAmountField(txn),
                type: "income",
            })),
            ...recentExpenseTransactions.map((txn) => ({
                ...normalizeAmountField(txn),
                type: "expense",
            })),
        ].sort((a, b) => b.date - a.date);

        res.json({
            totalBalance:
                (totalIncome[0]?.total || 0) - (totalExpense[0]?.total || 0),
            totalIncome: totalIncome[0]?.total || 0,
            totalExpense: totalExpense[0]?.total || 0,
            last30DaysExpenses: {
                total: expenseLast30Days,
                transactions: last30DaysExpenseTransaction,
            },
            last60DaysIncome: {
                total: incomeLast60Days,
                transactions: last60DaysIncomeTransactions,
            },
            recentTransactions: lastTransactions,
        });

    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}