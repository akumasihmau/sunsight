<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use RuntimeException;
use Tests\TestCase;
use Throwable;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Atribut Google palsu; tidak ada permintaan jaringan yang terjadi.
     *
     * @return SocialiteUser
     */
    private function googleUser(array $overrides = []): SocialiteUser
    {
        return (new SocialiteUser())->map(array_merge([
            'id' => '10769150350006150715113082367',
            'name' => 'Rafid Google',
            'email' => 'rafid.google@example.com',
            'avatar' => 'https://lh3.googleusercontent.com/a/rafid.png',
        ], $overrides));
    }

    /**
     * Mengganti driver Socialite dengan tiruan supaya tidak menembak jaringan.
     */
    private function fakeSocialite(Throwable|SocialiteUser $result): void
    {
        $provider = Mockery::mock(Provider::class);

        if ($result instanceof Throwable) {
            $provider->shouldReceive('user')->once()->andThrow($result);
        } else {
            $provider->shouldReceive('user')->once()->andReturn($result);
        }

        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);
    }

    public function test_redirect_google_mengarahkan_ke_akun_google(): void
    {
        config([
            'services.google.client_id' => 'klien-uji',
            'services.google.client_secret' => 'rahasia-uji',
            'services.google.redirect' => 'http://localhost:8000/api/auth/google-callback',
        ]);

        $response = $this->get('/auth/google/redirect');

        $response->assertRedirect();

        $location = (string) $response->headers->get('Location');

        // `redirect()` hanya menyusun URL, sehingga tidak ada permintaan ke Google.
        $this->assertStringStartsWith('https://accounts.google.com/', $location);
        $this->assertStringContainsString('client_id=klien-uji', $location);
        $this->assertStringContainsString(
            'redirect_uri='.urlencode('http://localhost:8000/api/auth/google-callback'),
            $location,
        );
    }

    public function test_konfigurasi_google_membaca_kredensial_dari_env(): void
    {
        $sebelumEnv = $_ENV['GOOGLE_CLIENT_ID'] ?? null;
        $sebelumServer = $_SERVER['GOOGLE_CLIENT_ID'] ?? null;

        $_ENV['GOOGLE_CLIENT_ID'] = 'klien-dari-env';
        $_SERVER['GOOGLE_CLIENT_ID'] = 'klien-dari-env';

        try {
            // `services.php` dibaca ulang agar `env(...)` dievaluasi dengan nilai di atas.
            $services = require config_path('services.php');

            $this->assertSame('klien-dari-env', $services['google']['client_id']);
            $this->assertSame(
                env('APP_URL').'/api/auth/google-callback',
                $services['google']['redirect'],
                'Redirect URI bawaannya diturunkan dari APP_URL.',
            );
        } finally {
            if ($sebelumEnv === null) {
                unset($_ENV['GOOGLE_CLIENT_ID']);
            } else {
                $_ENV['GOOGLE_CLIENT_ID'] = $sebelumEnv;
            }

            if ($sebelumServer === null) {
                unset($_SERVER['GOOGLE_CLIENT_ID']);
            } else {
                $_SERVER['GOOGLE_CLIENT_ID'] = $sebelumServer;
            }
        }
    }

    public function test_callback_google_membuat_user_baru_dan_mengirim_token_di_fragment(): void
    {
        $this->fakeSocialite($this->googleUser());

        $response = $this->get('/api/auth/google-callback');

        $response->assertRedirect();

        $location = (string) $response->headers->get('Location');

        $this->assertStringStartsWith('http://localhost:3000/auth/callback#token=', $location);
        // Token di fragment, bukan query string, supaya tidak tercatat di log server.
        $this->assertStringNotContainsString('?token=', $location);
        $this->assertStringEndsWith('&onboarded=0', $location);

        $user = User::where('email', 'rafid.google@example.com')->firstOrFail();

        $this->assertSame('10769150350006150715113082367', $user->google_id);
        $this->assertSame('https://lh3.googleusercontent.com/a/rafid.png', $user->avatar_url);
        $this->assertNotNull($user->email_verified_at);
        $this->assertNotEmpty($user->password);

        // Token yang dikirim benar-benar dapat dipakai pada endpoint terproteksi.
        $token = substr($location, strlen('http://localhost:3000/auth/callback#token='));
        $token = strstr($token, '&onboarded=', true);

        $this->withToken($token)->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('email', 'rafid.google@example.com');
    }

    public function test_callback_google_menautkan_akun_lama_lewat_email(): void
    {
        $user = User::factory()->create([
            'email' => 'rafid.google@example.com',
            'google_id' => null,
            'avatar_url' => null,
            'email_verified_at' => null,
        ]);

        $this->fakeSocialite($this->googleUser());

        $this->get('/api/auth/google-callback')->assertRedirect();

        $user->refresh();

        $this->assertSame('10769150350006150715113082367', $user->google_id);
        $this->assertSame('https://lh3.googleusercontent.com/a/rafid.png', $user->avatar_url);
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame(1, User::where('email', 'rafid.google@example.com')->count());
    }

    public function test_callback_google_menandai_onboarded_bila_sudah_selesai(): void
    {
        User::factory()->create([
            'email' => 'rafid.google@example.com',
            'onboarding_completed_at' => now(),
        ]);

        $this->fakeSocialite($this->googleUser());

        $location = (string) $this->get('/api/auth/google-callback')->headers->get('Location');

        $this->assertStringEndsWith('&onboarded=1', $location);
    }

    public function test_callback_google_tanpa_email_mengalihkan_dengan_kode_kesalahan(): void
    {
        $this->fakeSocialite($this->googleUser(['email' => null]));

        $this->get('/api/auth/google-callback')
            ->assertRedirect('http://localhost:3000/login?error=google_email_missing');

        $this->assertSame(0, User::count());
    }

    public function test_callback_google_yang_gagal_mengalihkan_dengan_kode_kesalahan(): void
    {
        $this->fakeSocialite(new RuntimeException('state tidak valid'));

        $this->get('/api/auth/google-callback')
            ->assertRedirect('http://localhost:3000/login?error=google_failed');

        $this->assertSame(0, User::count());
    }
}
