const User = require("../models/User");
const xlsx = require('xlsx');
const Income = require("../models/Income");

exports.addIncome = async (req, res) => {
    const userId = req.user.id;
    try {
        const { icon, source, date } = req.body;
        const amount = req.body.amount ?? req.body.ammount;

        const parsedAmount = Number(amount);

        if (!source || Number.isNaN(parsedAmount) || !date) {
            return res.status(400).json({message: "All fields are required"})
        }

        const newIncome = new Income ({
            userId,
            icon,
            source,
            amount: parsedAmount,
            date: new Date(date)
        });

        await newIncome.save();
        res.status(200).json(newIncome);

    } catch (error) {
        res.status(500).json({message: "Server error"})

    }

}

exports.getAllIncome = async (req, res) => {
    const userId = req.user.id;

    try {
        const income = await Income.find({ userId }).sort({ date: -1 });
        res.json(income);
    } catch (error) {
        res.status(500).json({message: "Server error"});
    }

}

exports.deleteIncome = async (req, res) => {
    const userId = req.user.id;

    try{
        await Income.findByIdAndDelete(req.params.id);
        res.json({message: "Income deleted successfully "});
    } catch (error) {
        res.status(500).json({message: "Server Error"});
    }

}

exports.downloadIncomeExcel = async (req, res) => {
    const userId = req.user.id;

    try {
        const income = await Income.find({ userId }).sort({ date: -1 });
        const data = income.map((item) => ({
            Source: item.source,
            Amount: item.amount,
            Date: item.date,
        }));
        
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(wb, ws, "Income");
        xlsx.writeFile(wb, 'income_details.xlsx');
        res.download('income_details.xlsx')
    } catch (error) {
        res.status(500).json({message: "Server Error"});
    }

};

