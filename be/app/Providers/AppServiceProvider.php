<?php

namespace App\Providers;

use App\Services\Imagery\ImageryProvider;
use App\Services\Imagery\SampleImageryProvider;
use App\Services\Imagery\TileImageryProvider;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(ImageryProvider::class, fn () => match (config('imagery.provider')) {
            'tile' => $this->app->make(TileImageryProvider::class),
            default => $this->app->make(SampleImageryProvider::class),
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
