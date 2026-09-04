namespace BarberAppointment.SolidExamples.Ocp;

public static class OcpDemo
{
    public static void Run()
    {
        var calculator = new QuoteCalculator();
        var regular = calculator.Quote(300m, new NoDiscountPolicy());
        var student = calculator.Quote(300m, new StudentDiscountPolicy());
        var happyHour = calculator.Quote(300m, new HappyHourDiscountPolicy());

        Console.WriteLine($"Normal: {regular} TL");
        Console.WriteLine($"Öğrenci: {student} TL");
        Console.WriteLine($"Happy hour: {happyHour} TL");
    }
}

public interface IDiscountPolicy
{
    decimal Apply(decimal amount);
}

public sealed class NoDiscountPolicy : IDiscountPolicy
{
    public decimal Apply(decimal amount) => amount;
}

public sealed class StudentDiscountPolicy : IDiscountPolicy
{
    public decimal Apply(decimal amount) => amount * 0.9m;
}

public sealed class HappyHourDiscountPolicy : IDiscountPolicy
{
    public decimal Apply(decimal amount) => amount * 0.8m;
}

public sealed class QuoteCalculator
{
    public decimal Quote(decimal basePrice, IDiscountPolicy policy)
    {
        return policy.Apply(basePrice);
    }
}
