<?php

namespace App\Providers;

use App\Services\Imagery\ImageryProvider;
use App\Services\Imagery\MapboxImageryProvider;
use App\Services\Imagery\SampleImageryProvider;
use App\Services\Imagery\TileImageryProvider;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(ImageryProvider::class, fn () => match (config('imagery.provider')) {
            'sample' => $this->app->make(SampleImageryProvider::class),
            'tile' => $this->app->make(TileImageryProvider::class),
            default => $this->app->make(MapboxImageryProvider::class),
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Membelokkan link reset password ke URL Next.js (aman saat config di-cache)
        ResetPassword::createUrlUsing(function (object $notifiable, string $token): string {
            $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/');
            $email = urlencode((string) $notifiable->getEmailForPasswordReset());

            return "{$frontendUrl}/reset-password?token={$token}&email={$email}";
        });
    }
}
